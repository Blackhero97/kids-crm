// tools/test-receipt.js
import "dotenv/config.js";
import { printReceiptOS } from "../services/osPrinter.js";

const BASE_COST = Number(process.env.BASE_COST) || 50000;
const PER_MINUTE = BASE_COST / 60;

const now = new Date();
// 1 soat 5 daqiqa oldin kirgan deb test qilamiz:
const entry = new Date(now.getTime() - 65 * 60 * 1000);
const paidUntil = new Date(entry.getTime() + 60 * 60 * 1000);
const extraMin = Math.max(0, Math.ceil((now - paidUntil) / 60000));

const receipt = {
  sessionId: "TEST-123",
  token: "XP-80",
  currency: "UZS",

  entry_time: entry,
  paid_until: paidUntil,
  exit_time: now,

  included_minutes: 60,
  extra_minutes: extraMin,
  per_minute: PER_MINUTE,

  base_amount: BASE_COST,
  extra_fee: Math.round(extraMin * PER_MINUTE),
  total: Math.round(BASE_COST + extraMin * PER_MINUTE),

  rounding: {
    round_to: Number(process.env.ROUND_TO ?? 100),
    strategy: process.env.ROUND_STRATEGY || "ceil",
  },
  printed_at: new Date(),
};

try {
  const pdfPath = await printReceiptOS(receipt);
  console.log("✅ Test kvitansiya yuborildi. PDF fayl:", pdfPath);
  console.log(
    "ℹ️ Agar PRINTER_NAME belgilanmagan bo‘lsa, default printerga yuborildi."
  );
} catch (e) {
  console.error("❌ Test print xato:", e);
  process.exit(1);
}
