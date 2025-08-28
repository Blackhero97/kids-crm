// src/components/ChildPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Hourglass,
  Printer,
} from "lucide-react";

// --- KICHIK YORDAMCHILAR ---
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("uz-UZ", { maximumFractionDigits: 0 });

const fmtDT = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// 58mm termal uchun brauzerda chek chop etish (fallback)
// Server ham chop etayotgan bo‘lsa, bu qo‘shimcha qulaylik sifatida.
function printReceiptClient(receipt) {
  // receipt: { sessionId, token, currency, entry_time, paid_until, exit_time, included_minutes, extra_minutes, per_minute, base_amount, extra_fee, total, printed_at, rounding }
  const w = window.open("", "_blank", "height=600,width=380");
  if (!w) return;

  const css = `
    <style>
      @page { size: 58mm auto; margin: 0; }
      body { width: 58mm; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace; font-size: 12px; }
      .rcpt { padding: 12px; }
      .center { text-align: center; }
      .bold { font-weight: 700; }
      .muted { color: #555; }
      .line { border-top: 1px dashed #000; margin: 8px 0; }
      .kv { display: flex; justify-content: space-between; margin: 2px 0; }
      .big { font-size: 14px; }
      .tot { font-size: 16px; font-weight: 800; }
      .qr { margin-top: 8px; }
      .logo { font-size: 16px; letter-spacing: 1px; }
    </style>
  `;

  const html = `
    <!doctype html>
    <html>
    <head><meta charset="utf-8">${css}</head>
    <body>
      <div class="rcpt">
        <div class="center logo bold">KidsPlay CRM</div>
        <div class="center muted">O'yin maydoni kvitansiyasi</div>
        <div class="line"></div>

        <div class="kv"><span>Session ID:</span><span>${
          receipt.sessionId
        }</span></div>
        <div class="kv"><span>Jeton:</span><span>${
          receipt.token ?? "-"
        }</span></div>
        <div class="kv"><span>Sana:</span><span>${fmtDT(
          receipt.printed_at
        )}</span></div>

        <div class="line"></div>
        <div class="kv"><span>Kirish:</span><span>${fmtDT(
          receipt.entry_time
        )}</span></div>
        <div class="kv"><span>To'langan vaqt:</span><span>${new Date(
          receipt.paid_until
        ).toLocaleTimeString()}</span></div>
        <div class="kv"><span>Chiqish:</span><span>${fmtDT(
          receipt.exit_time
        )}</span></div>

        <div class="line"></div>
        <div class="kv"><span>Kiritilgan (min):</span><span>${
          receipt.included_minutes
        }</span></div>
        <div class="kv"><span>Qo'shimcha (min):</span><span>${
          receipt.extra_minutes
        }</span></div>
        <div class="kv"><span>1 minut narxi:</span><span>${fmtMoney(
          receipt.per_minute
        )} ${receipt.currency}</span></div>

        <div class="line"></div>
        <div class="kv big"><span>Asosiy to'lov:</span><span>${fmtMoney(
          receipt.base_amount
        )} ${receipt.currency}</span></div>
        <div class="kv big"><span>Qo'shimcha to'lov:</span><span>${fmtMoney(
          receipt.extra_fee
        )} ${receipt.currency}</span></div>
        <div class="kv tot"><span>Jami:</span><span>${fmtMoney(
          receipt.total
        )} ${receipt.currency}</span></div>

        <div class="line"></div>
        <div class="center muted">Yaxlitlash: ${
          receipt.rounding?.strategy ?? "-"
        } / ${receipt.rounding?.round_to ?? "-"}</div>
        <div class="center" style="margin-top:6px;">Rahmat! 😊</div>
      </div>

      <script>
        window.onload = function(){
          setTimeout(function(){
            window.print();
            setTimeout(function(){ window.close(); }, 400);
          }, 200);
        }
      </script>
    </body>
    </html>
  `;

  w.document.write(html);
  w.document.close();
  w.focus();
}

export default function ChildPage() {
  const { qr_code } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [expired, setExpired] = useState(false);

  // 🔹 Bola ma'lumotini olish
  useEffect(() => {
    axios
      .get(`/api/children/qr/${qr_code}`)
      .then((res) => setChild(res.data))
      .catch((err) => console.error("Child yuklashda xato:", err));
  }, [qr_code]);

  // 🔹 Countdown
  useEffect(() => {
    if (!child) return;

    const start = new Date(child.entry_time);
    const paidEnd = child.paid_until
      ? new Date(child.paid_until)
      : new Date(start.getTime() + 60 * 60 * 1000);

    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = paidEnd - now;

      if (diffMs <= 0) {
        setCountdown("⏳ Vaqt tugadi!");
        setExpired(true);
      } else {
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const s = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdown(`${h} soat ${m} daqiqa ${s} soniya`);
        setExpired(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [child]);

  // 🔸 SCANdan keyin shu sahifa ochilganda — avtomatik taklif
  useEffect(() => {
    if (!child) return;
    // sessiya hali tugamagan bo‘lsa, taklif qilamiz
    if (!child.exit_time && child.token_code) {
      Swal.fire({
        title: "Sessiyani tugatasizmi?",
        html: `
          <div style="text-align:left">
            <div><b>Jeton:</b> ${child.token_code}</div>
            <div><b>Kirish:</b> ${fmtDT(child.entry_time)}</div>
            <div><b>To'langan vaqt:</b> ${new Date(
              child.paid_until ||
                new Date(new Date(child.entry_time).getTime() + 60 * 60 * 1000)
            ).toLocaleTimeString()}</div>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ha, tugat va chek chiqar",
        cancelButtonText: "Yo‘q",
        reverseButtons: true,
      }).then(async (res) => {
        if (res.isConfirmed) {
          await handleCheckoutAndPrint();
        }
      });
    }
  }, [child]); // bir marta ishlaydi

  // 🔹 Checkout + print ketma-ketligi
  const handleCheckoutAndPrint = async () => {
    try {
      if (!child?.token_code) {
        Swal.fire("Xatolik", "Jeton topilmadi", "error");
        return;
      }
      // 1) Toggle checkout
      const resp = await axios.get(
        `/api/children/scan/${encodeURIComponent(child.token_code)}`
      );
      const { receipt } = resp.data || {};
      // 2) Clientdan chek chiqarish (server tomoni ham sozlangan bo‘lsa, u ham jo‘natadi)
      if (receipt) printReceiptClient(receipt);

      // 3) OK — Dashboardga qaytamiz
      await Swal.fire({
        icon: "success",
        title: "Sessiya yakunlandi",
        html: `
          <div style="text-align:left">
            <div>Asosiy: <b>${fmtMoney(receipt?.base_amount)} UZS</b></div>
            <div>Qo'shimcha: <b>${fmtMoney(receipt?.extra_fee)} UZS</b></div>
            <div>JAMI: <b>${fmtMoney(receipt?.total)} UZS</b></div>
          </div>
        `,
        confirmButtonText: "Bosh sahifaga qaytish",
      });
      navigate("/");
    } catch (e) {
      console.error(e);
      Swal.fire("Xatolik", "Checkout yoki print amalga oshmadi", "error");
    }
  };

  // Tugagan bo‘lsa: qayta chek
  const handleReprint = async () => {
    try {
      const res = await axios.post(`/api/children/${child._id}/reprint`);
      const { receipt } = res.data || {};
      if (receipt) printReceiptClient(receipt);
      Swal.fire("Yuborildi", "Chek qayta chiqarildi", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Xatolik", "Chekni qayta chiqarib bo'lmadi", "error");
    }
  };

  if (!child)
    return <p className="p-6 text-center text-gray-500">⏳ Yuklanmoqda...</p>;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-lg w-full space-y-6 border border-gray-200">
        {/* Jeton/ID sarlavha */}
        <h1 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-3">
          <Users className="text-blue-500 w-7 h-7" />
          Sessiya:{" "}
          <span className="text-blue-700">
            {child.token_code || child.qr_code || child._id}
          </span>
        </h1>

        {/* Kirish / holat */}
        <p className="text-gray-600 flex items-center gap-2">
          <Calendar className="text-green-500" /> Kirgan:
          <span className="font-semibold">{fmtDT(child.entry_time)}</span>
        </p>

        {/* Holat badge */}
        {child.exit_time ? (
          <p className="text-gray-600 flex items-center gap-2">
            <CheckCircle className="text-red-500" /> Chiqqan:
            <span className="font-semibold">{fmtDT(child.exit_time)}</span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-green-600 font-semibold">
            <AlertCircle /> Hali ichkarida 🚸
          </p>
        )}

        {/* To'langan vaqt / countdown */}
        <div
          className={`p-4 rounded-xl border ${
            expired ? "border-red-400 bg-red-50" : "border-blue-200 bg-blue-50"
          } space-y-2`}
        >
          <p className="flex items-center gap-2 text-blue-700">
            <Clock className="text-blue-500" /> To‘langan vaqt (gacha):
            <span className="font-semibold">
              {new Date(
                child.paid_until ||
                  new Date(child.entry_time).getTime() + 60 * 60 * 1000
              ).toLocaleTimeString()}
            </span>
          </p>
          <p
            className={`flex items-center gap-2 font-bold text-lg ${
              expired ? "text-red-600 animate-pulse" : "text-purple-700"
            }`}
          >
            <Hourglass className="text-purple-500 animate-pulse" /> Qolgan vaqt:{" "}
            {countdown}
          </p>
        </div>

        {/* Tugmalar */}
        <div className="flex flex-wrap gap-3 justify-center">
          {!child.exit_time ? (
            <button
              onClick={handleCheckoutAndPrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg shadow hover:bg-rose-700"
              title="Sessiyani yakunlash va chek chiqarish"
            >
              <Printer className="w-4 h-4" /> Yakunlash + Chek
            </button>
          ) : (
            <button
              onClick={handleReprint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
              title="Chekni qayta chiqarish"
            >
              <Printer className="w-4 h-4" /> Chek (reprint)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
