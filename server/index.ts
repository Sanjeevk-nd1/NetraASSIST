import express, { type Request, Response, NextFunction } from "express";
import pg from "pg";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import { randomBytes } from "crypto";
import { jwtMiddleware } from "./middleware/jwt"; // your JWT middleware

dotenv.config();

// Log important env vars
console.log("Environment variables:", {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
});

// Express app setup
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err: Error) => {
  console.error("PostgreSQL pool error:", err.message);
});

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set in .env");
  process.exit(1);
}

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// JWT middleware example usage
// Apply globally if most routes are protected, or apply per-route in routes.ts
// app.use(jwtMiddleware);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Server error:", err);
  res.status(status).json({ message });
});

(async () => {
  try {
    // Test DB connection
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      console.log("Connected to PostgreSQL database:", process.env.DATABASE_URL);
    } finally {
      client.release();
    }

    const server = await registerRoutes(app);

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
    server.listen(port, host, () => log(`Server running on http://${host}:${port}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();