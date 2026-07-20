import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first hop from Replit's reverse proxy so that express-rate-limit
// can read the real client IP from X-Forwarded-For rather than seeing the
// proxy's internal address (which would trigger ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
// Native mobile clients don't send an Origin header, so we allow all origins
// by default. If ALLOWED_ORIGINS is set (comma-separated), browser clients are
// restricted to that list while native clients (no Origin) still pass through.
const allowedOrigins = process.env["ALLOWED_ORIGINS"]
  ? process.env["ALLOWED_ORIGINS"].split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, cb) => {
      // Native mobile / curl — no Origin header — always allow
      if (!origin) return cb(null, true);
      // No allowlist configured → open to all browser origins
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General: 200 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Strict: 20 requests per 15 minutes for write/auth operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

app.use("/api", generalLimiter);
app.use("/api/setup", strictLimiter);
app.use("/api/admin/members", (req, res, next) => {
  if (req.method === "POST" || req.method === "DELETE") return strictLimiter(req, res, next);
  next();
});
app.use("/api/members/me/password", strictLimiter);

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  const status = (err as Error & { status?: number }).status ?? 500;
  const message =
    process.env["NODE_ENV"] === "production" ? "Internal server error" : err.message;
  res.status(status).json({ error: message });
});

export default app;
