import { Request, Response, NextFunction } from "express";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const requests = new Map<string, { count: number; resetAt: number }>();

export const aiRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const key = req.ip || "unknown";
  const now = Date.now();

  const current = requests.get(key);

  if (!current || now > current.resetAt) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_REQUESTS) {
    res.status(429).json({
      message: "Too many AI requests. Please try again in a minute.",
    });
    return;
  }

  current.count += 1;
  requests.set(key, current);
  next();
};
