import { Response } from "express";
import fs from "fs";
import path from "path";
import { AuthRequest } from "../middleware/authMiddleware";
import Car from "../models/Car";
import Comment from "../models/Comment";

// Normalize features to always be string[]
const normalizeFeatures = (features: unknown): string[] => {
  if (!features) return [];

  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [features];
    } catch {
      return [features];
    }
  }

  if (Array.isArray(features)) {
    return features.flatMap((feature) => normalizeFeatures(feature));
  }

  return [];
};

/**
 * @swagger
 * /cars:
 *   get:
 *     tags: [Cars]
 *     summary: Get all car listings with pagination and optional filters
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Paginated list of cars
 */
export const getCars = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (req.query.brand) query.brand = new RegExp(req.query.brand as string, "i");
  if (req.query.location)
    query.location = new RegExp(req.query.location as string, "i");
  if (req.query.maxPrice)
    query.pricePerDay = { $lte: Number(req.query.maxPrice) };
  if (req.query.fuelType) query.fuelType = req.query.fuelType;
  if (req.query.transmission) query.transmission = req.query.transmission;

  const [cars, total] = await Promise.all([
    Car.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "username profileImage"),
    Car.countDocuments(query),
  ]);

  const commentsPerCar = await Promise.all(
    cars.map((car) => Comment.countDocuments({ car: car._id })),
  );

  const carsWithMeta = cars.map((car, i) => ({
    ...car.toObject(),
    commentsCount: commentsPerCar[i],
  }));

  res.json({
    cars: carsWithMeta,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

/**
 * @swagger
 * /cars/{id}:
 *   get:
 *     tags: [Cars]
 *     summary: Get a single car listing by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car listing details
 *       404:
 *         description: Car not found
 */
export const getCar = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const car = await Car.findById(req.params.id).populate(
    "owner",
    "username profileImage",
  );
  if (!car) {
    res.status(404).json({ message: "Car not found" });
    return;
  }

  const commentsCount = await Comment.countDocuments({ car: car._id });
  res.json({ ...car.toObject(), commentsCount });
};

/**
 * @swagger
 * /cars:
 *   post:
 *     tags: [Cars]
 *     summary: Create a new car listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description, brand, model, year, transmission, fuelType, pricePerDay]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: string
 *                 description: 4-digit year (e.g., 2020)
 *                 pattern: '^\d{4}$'
 *               seats:
 *                 type: integer
 *               transmission:
 *                 type: string
 *                 enum: [Manual, Automatic, CVT, Robotic, DCT]
 *               fuelType:
 *                 type: string
 *                 enum: [Gasoline, Diesel, Electric, Hybrid]
 *               location:
 *                 type: string
 *               pricePerDay:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Car listing created
 *       400:
 *         description: Missing required fields or invalid year format
 *       401:
 *         description: Unauthorized
 */
export const createCar = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const {
    title,
    description,
    brand,
    model,
    year,
    seats,
    transmission,
    fuelType,
    location,
    pricePerDay,
    features: rawFeatures,
    rules: rawRules,
  } = req.body;

  if (
    !title?.trim() ||
    !description?.trim() ||
    !brand?.trim() ||
    !model?.trim() ||
    !year ||
    !/^\d{4}$/.test(String(year)) ||
    !transmission ||
    !fuelType ||
    !pricePerDay
  ) {
    res.status(400).json({
      message:
        "Required fields: title, description, brand, model, year (4 digits), transmission, fuelType, pricePerDay",
    });
    return;
  }

  const features = normalizeFeatures(rawFeatures);
  let rules = {};

  try {
    if (typeof rawRules === "string") {
      rules = JSON.parse(rawRules);
    } else if (rawRules && typeof rawRules === "object") {
      rules = rawRules;
    }
  } catch (err) {
    rules = {};
  }

  try {
    const uploadedImages =
      (req.files as Express.Multer.File[] | undefined)?.map(
        (file) => file.filename,
      ) ?? [];
    const car = await Car.create({
      owner: req.userId,
      title: title.trim(),
      description: description.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year),
      seats: seats ? Number(seats) : undefined,
      transmission,
      fuelType,
      location: location?.trim(),
      pricePerDay: Number(pricePerDay),
      image: uploadedImages[0] || "",
      images: uploadedImages,
      features,
      rules,
    });

    await car.populate("owner", "username profileImage");
    res.status(201).json(car);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: err.message || "Failed to create car listing" });
  }
};

/**
 * @swagger
 * /cars/{id}:
 *   put:
 *     tags: [Cars]
 *     summary: Update a car listing (owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Car not found
 */
export const updateCar = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    res.status(404).json({ message: "Car not found" });
    return;
  }

  if (car.owner.toString() !== req.userId) {
    res.status(403).json({ message: "Not authorized" });
    return;
  }

  const updates: Record<string, any> = { ...req.body };
  const unsetFields: Record<string, ""> = {};

  if (updates.year !== undefined) {
    if (!/^\d{4}$/.test(String(updates.year))) {
      res.status(400).json({ message: "Year must be exactly 4 digits" });
      return;
    }

    updates.year = Number(updates.year);
  }

  if (updates.pricePerDay !== undefined) {
    updates.pricePerDay = Number(updates.pricePerDay);
  }

  if (updates.seats === "") {
    delete updates.seats;
    unsetFields.seats = "";
  } else if (updates.seats !== undefined) {
    updates.seats = Number(updates.seats);
  }

  if (updates.location === "") {
    updates.location = "";
  }

  if (updates.features !== undefined) {
    updates.features = normalizeFeatures(updates.features);
  }

  if (typeof updates.rules === "string") {
    updates.rules = JSON.parse(updates.rules);
  }

  const uploadedImages =
    (req.files as Express.Multer.File[] | undefined)?.map(
      (file) => file.filename,
    ) ?? [];

  let keptImages: string[] = [];

  if (updates.keepImages !== undefined) {
    try {
      keptImages =
        typeof updates.keepImages === "string"
          ? JSON.parse(updates.keepImages)
          : Array.isArray(updates.keepImages)
            ? updates.keepImages
            : [];
    } catch {
      keptImages = [];
    }
  } else {
    keptImages = car.images?.length ? car.images : car.image ? [car.image] : [];
  }

  delete updates.keepImages;

  const currentImages = car.images?.length
    ? car.images
    : car.image
      ? [car.image]
      : [];

  const nextImages = [...keptImages, ...uploadedImages].slice(0, 8);

  const imagesToDelete = currentImages.filter(
    (image) => !nextImages.includes(image),
  );

  imagesToDelete.forEach((image) => {
    const imagePath = path.join(process.cwd(), "uploads", image);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  });

  updates.images = nextImages;
  updates.image = nextImages[0] ?? "";

  const updateQuery =
    Object.keys(unsetFields).length > 0
      ? { $set: updates, $unset: unsetFields }
      : { $set: updates };

  const updated = await Car.findByIdAndUpdate(req.params.id, updateQuery, {
    new: true,
    runValidators: true,
  }).populate("owner", "username profileImage");

  res.json(updated);
};

/**
 * @swagger
 * /cars/{id}:
 *   delete:
 *     tags: [Cars]
 *     summary: Delete a car listing (owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Car not found
 */
export const deleteCar = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const car = await Car.findById(req.params.id);
  if (!car) {
    res.status(404).json({ message: "Car not found" });
    return;
  }

  if (car.owner.toString() !== req.userId) {
    res.status(403).json({ message: "Not authorized" });
    return;
  }

  if (car.image) {
    const imagePath = path.join(process.cwd(), "uploads", car.image);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }

  await car.deleteOne();
  await Comment.deleteMany({ car: req.params.id });

  res.json({ message: "Car listing deleted" });
};

/**
 * @swagger
 * /cars/{id}/like:
 *   post:
 *     tags: [Cars]
 *     summary: Toggle like on a car listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
 *       404:
 *         description: Car not found
 */
export const toggleLike = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const car = await Car.findById(req.params.id);
  if (!car) {
    res.status(404).json({ message: "Car not found" });
    return;
  }

  const userId = req.userId!;
  const alreadyLiked = car.likes.includes(userId);

  if (alreadyLiked) {
    car.likes = car.likes.filter((id) => id !== userId);
  } else {
    car.likes.push(userId);
  }

  await car.save();
  res.json({ liked: !alreadyLiked, likesCount: car.likes.length });
};
