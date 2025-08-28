// services/osPrinter.js
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import pkg from "pdf-to-printer";
const { print, getPrinters } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mmToPt = (mm) => Math.round((mm * 72) / 25.4);

/* ENV */
const WIDTH_MM = Number(process.env.RECEIPT_WIDTH_MM || 68);
const HEIGHT_MM = Number(process.env.RECEIPT_HEIGHT_MM || 220);
const MARGIN_MM = Number(process.env.RECEIPT_MARGIN_MM || 2);
const SCALE = Math.max(
  0.8,
  Math.min(1.2, Number(process.env.RECEIPT_FONT_SCALE || 0.96))
);

function dashedLine(doc) {
  const x1 = doc.page.margins.left;
  const x2 = doc.page.width - doc.page.margins.right;
  const y = doc.y + 2;
  doc
    .save()
    .lineWidth(0.8)
    .strokeColor("#000")
    .moveTo(x1, y)
    .lineTo(x2, y)
    .dash(1, { space: 2 })
    .stroke()
    .undash()
    .restore();
  doc.moveDown(0.35);
}

// dd/MM/yy, HH:mm ko‘rinish
function fmtDTShort(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const MM = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  const HH = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}/${MM}/${yy}, ${HH}:${mm}`;
}
const fmtNum = (n) => Math.round(n ?? 0).toLocaleString("uz-UZ");
const fmtMoney = (n) => `${fmtNum(n)} so'm`;

export async function printReceiptOS(receipt) {
  const W = mmToPt(WIDTH_MM);
  const H = mmToPt(HEIGHT_MM);
  const M = mmToPt(MARGIN_MM);

  const outDir = path.join(__dirname, "..", "receipts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filename = `receipt_${receipt.sessionId}_${Date.now()}.pdf`;
  const filepath = path.join(outDir, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [W, H],
      margins: { top: M, bottom: M, left: M, right: M },
    });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Shrifts
    const h1 = Math.round(12.5 * SCALE);
    const h2 = Math.round(10.0 * SCALE);
    const body = Math.round(9.2 * SCALE);
    const sum = Math.round(11.2 * SCALE);

    /* ===== Header — BARCHASI CHAPGA TEKIS ===== */
    doc
      .font("Helvetica-Bold")
      .fontSize(h1)
      .fillColor("#000")
      .text("KIDS CRM", { align: "left", width: W - 2 * M });
    doc
      .font("Helvetica")
      .fontSize(h2)
      .text("Qabul kvitansiyasi", { align: "left", width: W - 2 * M });
    dashedLine(doc);

    /* ===== Body — hammasi chapdan va yangi qatorda ===== */
    const shortId =
      receipt.customerIdShort ||
      String(receipt.sessionId || "")
        .slice(-6)
        .toUpperCase();

    doc.font("Helvetica").fontSize(body);
    doc.text(`Mijoz ID: ${shortId}`);
    doc.text(`Jeton: ${receipt.token || "-"}`);
    doc.text(`Kirish: ${fmtDTShort(receipt.entry_time)}`);
    doc.text(`Chiqish: ${fmtDTShort(receipt.exit_time)}`);

    const totalMin =
      (Number(receipt.included_minutes) || 0) +
      (Number(receipt.extra_minutes) || 0);
    doc.text(`Davomiylik: ${totalMin} min`);

    doc.text(`Baza (1 soat): ${fmtMoney(receipt.base_amount)}`);
    doc.text(`Qo'shimcha: ${fmtMoney(receipt.extra_fee || 0)}`);

    // JAMI — chapdan
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(sum - 1);
    doc.text(`JAMI: ${fmtNum(receipt.total)} so'm`, { align: "left" });
    doc.moveDown(0.2);
    dashedLine(doc);

    // Valyuta, Chop etildi, Rahmat — ham chapda
    doc.font("Helvetica").fontSize(body);
    doc.text(`Valyuta: ${receipt.currency || "UZS"}`, { align: "left" });
    doc.text(`Chop etildi: ${fmtDTShort(receipt.printed_at || new Date())}`, {
      align: "left",
    });
    doc.font("Helvetica-Bold").fontSize(h2).text("Rahmat!", { align: "left" });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const opts = {};
  if (process.env.PRINTER_NAME) opts.printer = process.env.PRINTER_NAME;
  await print(filepath, opts);
  return filepath;
}

export async function listPrinters() {
  return await getPrinters();
}
