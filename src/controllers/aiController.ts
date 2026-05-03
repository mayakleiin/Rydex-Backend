import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Car from "../models/Car";
import Comment from "../models/Comment";

// Cache to avoid excessive Gemini API calls
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getCached = (key: string): unknown | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setCache = (key: string, data: unknown): void => {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

/**
 * @swagger
 * /ai/search:
 *   post:
 *     tags: [AI]
 *     summary: Natural language search for car listings using Gemini AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: "I need an electric car with at least 5 seats in Tel Aviv under 300 NIS per day"
 *     responses:
 *       200:
 *         description: Search results with extracted parameters
 *       400:
 *         description: Query is required
 */
export const searchCars = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = req.body;

  if (!query?.trim()) {
    res.status(400).json({ message: "Search query is required" });
    return;
  }

  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  let searchParams: Record<string, unknown> = {};

  // Only call Gemini if API key is configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a car rental search assistant. Extract search parameters from this natural language query: "${query}"
Return ONLY a JSON object with these optional fields:
- brand: car brand/make (string)
- model: car model (string)
- transmission: "Manual", "Automatic", "CVT", "Robotic", or "DCT"
- fuelType: "Gasoline", "Diesel", "Electric", or "Hybrid"
- maxPrice: maximum price per day (number)
- minSeats: minimum number of seats (number)
- location: city or location (string)
Return only the JSON, no explanation.`;

      const result = await model.generateContent(prompt);
      console.log("AI RAW RESPONSE:", result.response.text());
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        searchParams = JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.error("[AI Search] Gemini API error:", err);
      // AI failed - fall back to keyword search
    }
  }

  const FUEL_MAP: Record<string, string> = {
    gasoline: "Gasoline", petrol: "Gasoline", benzine: "Gasoline",
    diesel: "Diesel",
    electric: "Electric",
    hybrid: "Hybrid",
  };
  const TRANS_MAP: Record<string, string> = {
    automatic: "Automatic", auto: "Automatic",
    manual: "Manual",
    cvt: "CVT",
    robotic: "Robotic",
    dct: "DCT",
  };

  // Build MongoDB query from extracted parameters
  const mongoQuery: Record<string, unknown> = {};
  if (searchParams.brand)
    mongoQuery.brand = new RegExp(searchParams.brand as string, "i");
  if (searchParams.model)
    mongoQuery.model = new RegExp(searchParams.model as string, "i");
  if (searchParams.transmission) {
    const normalized = TRANS_MAP[(searchParams.transmission as string).toLowerCase()];
    if (normalized) mongoQuery.transmission = normalized;
  }
  if (searchParams.fuelType) {
    const normalized = FUEL_MAP[(searchParams.fuelType as string).toLowerCase()];
    if (normalized) mongoQuery.fuelType = normalized;
  }
  if (searchParams.maxPrice)
    mongoQuery.pricePerDay = { $lte: searchParams.maxPrice };
  if (searchParams.minSeats) mongoQuery.seats = { $gte: searchParams.minSeats };
  if (searchParams.location)
    mongoQuery.location = new RegExp(searchParams.location as string, "i");

  // If Gemini extracted nothing, detect structured fields from keywords then fall back to text search
  if (Object.keys(mongoQuery).length === 0) {
    const q = query.toLowerCase();

    const fuelMatch = Object.keys(FUEL_MAP).find((k) => q.includes(k));
    if (fuelMatch) mongoQuery.fuelType = FUEL_MAP[fuelMatch];

    const transMatch = Object.keys(TRANS_MAP).find((k) => q.includes(k));
    if (transMatch) mongoQuery.transmission = TRANS_MAP[transMatch];

    const seatMatch = q.match(/(\d+)\s*seat/);
    if (seatMatch) mongoQuery.seats = { $gte: parseInt(seatMatch[1]) };

    if (Object.keys(mongoQuery).length === 0) {
      const keywords = query.trim().split(/\s+/).filter((w: string) => w.length > 3);
      const searchTerms = keywords.length > 0 ? keywords : [query.trim()];
      mongoQuery.$or = searchTerms.flatMap((word: string) => [
        { title: new RegExp(word, "i") },
        { description: new RegExp(word, "i") },
        { brand: new RegExp(word, "i") },
        { model: new RegExp(word, "i") },
        { location: new RegExp(word, "i") },
      ]);
    }
  }

  const cars = await Car.find(mongoQuery)
    .limit(20)
    .sort({ createdAt: -1 })
    .populate("owner", "username profileImage");

  const commentsPerCar = await Promise.all(
    cars.map((car) => Comment.countDocuments({ car: car._id })),
  );

  const carsWithMeta = cars.map((car, i) => ({
    ...car.toObject(),
    commentsCount: commentsPerCar[i],
  }));

  const responseData = {
    cars: carsWithMeta,
    searchParams,
    query,
    total: carsWithMeta.length,
  };
  setCache(cacheKey, responseData);

  res.json(responseData);
};
