// routes/history.js
import express from "express";
import {
  listHistory,
  getDailyReport,
  getRangeReport,
  getBySession,
  backfillHistory,
} from "../controllers/historyController.js";

const router = express.Router();

// 📋 To‘liq ro‘yxat (pagination va filter bilan)
router.get("/history", listHistory);

// 📆 Kunlik hisobot
router.get("/history/daily", getDailyReport);

// 📆 Oraliq bo‘yicha hisobot
router.get("/history/range", getRangeReport);

// 🔎 Bitta sessiya bo‘yicha
router.get("/history/by-session/:id", getBySession);

// 🛠 Admin uchun — backfill
router.post("/history/backfill/:id", backfillHistory);

export default router;
