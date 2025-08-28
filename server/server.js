// server.js
import "dotenv/config.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import childrenRoutes from "./routes/children.js";
import historyRoutes from "./routes/history.js"; // /api/reports/daily va (istasa) /api/history/...

const app = express();

/* ========= Asosiy sozlamalar ========= */
app.set("trust proxy", 1);

/* ========= Request loglari (diagnostika uchun) ========= */
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

/* ========= CORS & Body parser ========= */
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : true; // dev uchun true

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

/* ========= Health check ========= */
app.get("/api", (_req, res) => {
  res.send("Backend ishlayapti 🚀");
});
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

/* ========= API Routes ========= */
app.use("/api/children", childrenRoutes);
app.use("/api", historyRoutes);

/* ========= 404 handler (faqat API uchun) ========= */
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route topilmadi" });
});

/* ========= Global error handler ========= */
app.use((err, _req, res, _next) => {
  console.error("❌ Global error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Server xatosi",
  });
});

/* ========= MongoDB ulanish va serverni ishga tushirish ========= */
const MONGO_URL =
  process.env.MONGO_URL ||
  process.env.MONGO_URI || // ← eski .env bilan moslik
  "mongodb://127.0.0.1:27017/kids_crm";

const PORT = Number(process.env.PORT) || 5000;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB ulandi ✅");
    app.listen(PORT, () => {
      console.log(`Server ${PORT} portda ishlayapti 🚀`);
    });
  })
  .catch((err) => {
    console.error("MongoDB xato ❌", err);
    process.exit(1);
  });

/* ========= Graceful shutdown (ixtiyoriy) ========= */
process.on("SIGINT", async () => {
  console.log("\n⬇️ SIGINT: MongoDB ulanishi yopilmoqda...");
  await mongoose.connection.close();
  process.exit(0);
});
