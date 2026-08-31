import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/validation";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Not Found", message: `No route matches ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }
  if (err?.name === "ZodError") {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid request body.", details: err.issues });
  }
  console.error("[error]", err);
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again." });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
