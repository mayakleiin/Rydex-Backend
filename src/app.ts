import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import passport from "passport";

import { setupPassport } from "./config/passport";
import { setupSwagger } from "./config/swagger";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import carRoutes from "./routes/carRoutes";
import commentRoutes from "./routes/commentRoutes";
import aiRoutes from "./routes/aiRoutes";
import bookingRoutes from "./routes/bookingRoutes";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

setupPassport();

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Old routes - keep for local tests/dev
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/cars", carRoutes);
app.use("/comments", commentRoutes);
app.use("/ai", aiRoutes);
app.use("/bookings", bookingRoutes);

// Production API routes - use these from frontend on the college domain
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/bookings", bookingRoutes);

setupSwagger(app);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: err.message || "Internal server error" });
});

export default app;
