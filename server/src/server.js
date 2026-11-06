import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/bookings.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "../..");
const port = Number(process.env.PORT) || 4000;

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing. Copy server/.env.example to server/.env.");
  process.exit(1);
}

const app = express();

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use(
  express.static(siteRoot, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (/\.(html|css|js)$/.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.use((req, res) => {
  if (req.method === "GET" && !path.extname(req.path)) {
    return res.sendFile(path.join(siteRoot, "index.html"));
  }
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side" });
});

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(port, () => {
      console.log(`TR Motors running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
