// routes/children.js
import express from "express";
import {
  getChildren,
  getChildByQr,
  getChildByCode,
  checkoutChild,
  extendTime,
  scanByToken,
  getHistoryByToken,
  reprintReceipt, // ⬅️ YANGI: reprint controller
} from "../controllers/childrenController.js";

const router = express.Router();

// 📋 Hamma sessiyalar
router.get("/", getChildren);

// (ixtiyoriy, eski tizim)
router.get("/qr/:qr_code", getChildByQr);
router.get("/by-code/:code", getChildByCode);

// Manual amallar (ixtiyoriy)
router.put("/checkout/:id", checkoutChild);
router.put("/extend/:id", extendTime);

// 🔁 Jeton toggle (KERAKLI)
router.get("/scan/:token", scanByToken);

// 🗂 Jeton tarixi (ixtiyoriy)
router.get("/history/:token", getHistoryByToken);

// 🖨️ Chekni qayta chop etish (yakunlangan sessiya uchun)
router.post("/:id/reprint", reprintReceipt); // ⬅️ YANGI

export default router;
