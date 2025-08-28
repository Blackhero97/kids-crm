// src/components/Dashboard.jsx
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Users, DollarSign, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import ScannerListener from "../components/ScannerListener";

export default function Dashboard() {
  const [children, setChildren] = useState([]);
  const [stats, setStats] = useState({ total: 0, inside: 0, revenue: 0 });
  const [countdowns, setCountdowns] = useState({});
  const [extraMinutes, setExtraMinutes] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [lastCode, setLastCode] = useState("");

  // Qidiruv + filtr
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | inside | done

  // 🔔 Beep
  const [audioEnabled, setAudioEnabled] = useState(false);
  const beepRef = useRef(null);
  const beepedRef = useRef(new Set());

  const itemsPerPage = 10;
  const baseCost = 50000;
  const navigate = useNavigate();

  // Beep audio init
  useEffect(() => {
    const audio = new Audio("/beep.mp3");
    audio.preload = "auto";
    audio.volume = 1.0;
    beepRef.current = audio;
  }, []);

  const enableSound = async () => {
    try {
      if (!beepRef.current) return;
      beepRef.current.currentTime = 0;
      await beepRef.current.play();
      beepRef.current.pause();
      beepRef.current.currentTime = 0;
      setAudioEnabled(true);
    } catch (e) {
      alert("Ovozga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.");
    }
  };

  // Fetch
  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await axios.get("/api/children");
      setChildren(res.data);

      const total = res.data.length;
      const inside = res.data.filter((c) => !c.exit_time).length;
      const revenue = res.data.reduce(
        (sum, c) =>
          sum + (c.paid_amount ? c.paid_amount : !c.exit_time ? baseCost : 0),
        0
      );
      setStats({ total, inside, revenue });
    } catch (err) {
      console.error(err);
    }
  };

  // Skan
  // ⬇️ SKAN KODINI QABUL QILISH — faqat jeton toggle endpoint
  const handleScan = async (code) => {
    try {
      setLastCode(code);

      // ✅ Jeton toggle: aktiv bo‘lsa → checkout, aks holda → checkin
      const res = await axios.get(
        `/api/children/scan/${encodeURIComponent(code)}`
      );

      // Ro‘yxatni yangilab qo‘yamiz
      await fetchChildren();

      // Ixtiyoriy bildirish (Swal ishlatmayapmiz, UI-ni buzmaslik uchun oddiy alert)
      if (res.data?.action === "checkin") {
        alert(`Kirish rasmiylashtirildi (jeton: ${code}) — 1 soat oldindan.`);
        // xohlasangiz sahifaga o'ting:
        // navigate(`/child/${res.data.child?.qr_code}`);
      } else if (res.data?.action === "checkout") {
        const r = res.data.receipt;
        const extra = r?.extra_minutes || 0;
        const total = r?.total?.toLocaleString("uz-UZ") || "";
        alert(
          `Chiqish rasmiylashtirildi (jeton: ${code}).\n` +
            `Qo‘shimcha: ${extra} min\nJami: ${total} so‘m`
        );
        // checkoutdan keyin bosh sahifada qolamiz
      } else {
        alert("Jeton bo‘yicha amal bajarilmadi.");
      }
    } catch (e) {
      console.warn("Scan error:", e?.response?.data || e.message);
      alert(
        e?.response?.data?.error ||
          "Jeton bo‘yicha amal bajarilmadi. Server logini tekshiring."
      );
    }
  };

  // Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns = {};
      const newExtraMinutes = {};

      children.forEach((child) => {
        const now = new Date();
        const entry = new Date(child.entry_time);
        const paidUntil = child.paid_until
          ? new Date(child.paid_until)
          : new Date(entry.getTime() + 60 * 60 * 1000);

        if (!child.exit_time) {
          const diffMs = paidUntil - now;
          if (diffMs > 0) {
            const totalMinutes = Math.floor(diffMs / (1000 * 60));
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            const s = Math.floor((diffMs % (1000 * 60)) / 1000);
            newCountdowns[child._id] = `${h} soat ${m} daqiqa ${s} soniya`;
          } else {
            const extraMin = Math.floor((now - paidUntil) / (1000 * 60));
            newCountdowns[child._id] = "⏳ Vaqt tugadi!";
            newExtraMinutes[child._id] = extraMin;
          }
        } else {
          newCountdowns[child._id] = "Chiqib ketgan";
        }
      });

      setCountdowns(newCountdowns);
      setExtraMinutes(newExtraMinutes);
    }, 1000);

    return () => clearInterval(interval);
  }, [children]);

  // Beep (2 min qolganda)
  useEffect(() => {
    if (!audioEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();

      children.forEach((child) => {
        if (child.exit_time) {
          beepedRef.current.delete(child._id);
          return;
        }

        const entry = new Date(child.entry_time);
        const paidUntil = child.paid_until
          ? new Date(child.paid_until)
          : new Date(entry.getTime() + 60 * 60 * 1000);

        const diffMs = paidUntil - now;
        const threshold = 2 * 60 * 1000;

        if (diffMs > 0 && diffMs <= threshold) {
          if (!beepedRef.current.has(child._id)) {
            const a = beepRef.current;
            if (a) {
              try {
                a.currentTime = 0;
                a.play().catch(() => {});
              } catch {}
            }
            beepedRef.current.add(child._id);
          }
        } else {
          if (diffMs > threshold + 10 * 1000) {
            beepedRef.current.delete(child._id);
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [audioEnabled, children]);

  // Qidiruv + filtr
  const filteredChildren = children.filter((c) => {
    const tokenStr = String(c.token_code || c.qr_code || c._id || "")
      .toLowerCase()
      .trim();
    const match = tokenStr.includes(q.toLowerCase().trim());

    if (filter === "inside") return !c.exit_time && match;
    if (filter === "done") return !!c.exit_time && match;
    return match;
  });

  // Pagination
  const items = filteredChildren;
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedChildren = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Tezkor amallar
  const extend = async (id, minutes) => {
    try {
      await axios.put(`/api/children/extend/${id}`, { minutes });
      fetchChildren();
    } catch (e) {
      console.error(e);
      alert("Uzaytirib bo'lmadi");
    }
  };

  const checkout = async (id) => {
    try {
      await axios.put(`/api/children/checkout/${id}`, { extraMinutes: 0 });
      fetchChildren();
    } catch (e) {
      console.error(e);
      alert("Checkout xatosi");
    }
  };

  // 🖨️ Reprint
  const reprint = async (id) => {
    try {
      await axios.post(`/api/children/${id}/reprint`);
      alert("Chek qayta yuborildi ✅");
    } catch (e) {
      console.error(e);
      alert("Chek chop xatosi");
    }
  };

  // Excel
  const exportToExcel = () => {
    if (!children.length) return;

    const data = children.map((child) => ({
      Token: child.token_code || "-",
      "Sessiya ID": child._id,
      Kirish: child.entry_time
        ? new Date(child.entry_time).toLocaleString()
        : "-",
      Chiqish: child.exit_time
        ? new Date(child.exit_time).toLocaleString()
        : "-",
      "Qolgan vaqti / Qo‘shimcha min": !child.exit_time
        ? countdowns[child._id] || ""
        : "Chiqib ketgan",
      "To‘lov": !child.exit_time
        ? child.paid_amount
          ? child.paid_amount.toLocaleString()
          : baseCost.toLocaleString()
        : child.paid_amount?.toLocaleString() || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sessiyalar");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, `sessiyalar_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="p-8 space-y-10 bg-gradient-to-br from-blue-50 to-purple-100 min-h-screen">
      <ScannerListener onScan={handleScan} />

      {/* Statistik kartalar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow-xl rounded-2xl p-6 flex items-center gap-4 hover:scale-105 transition-transform duration-300 border-t-4 border-blue-500">
          <div className="bg-blue-100 p-3 rounded-full">
            <Users className="text-blue-600 w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Jami sessiyalar</p>
            <h2 className="text-3xl font-extrabold text-gray-800">
              {stats.total}
            </h2>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-6 flex items-center gap-4 hover:scale-105 transition-transform duration-300 border-t-4 border-green-500">
          <div className="bg-green-100 p-3 rounded-full">
            <Calendar className="text-green-600 w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Hozir ichkarida</p>
            <h2 className="text-3xl font-extrabold text-gray-800">
              {stats.inside}
            </h2>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-6 flex items-center gap-4 hover:scale-105 transition-transform duration-300 border-t-4 border-purple-500">
          <div className="bg-purple-100 p-3 rounded-full">
            <DollarSign className="text-purple-600 w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Umumiy tushum</p>
            <h2 className="text-3xl font-extrabold text-gray-800">
              {stats.revenue.toLocaleString()} so‘m
            </h2>
          </div>
        </div>
      </div>

      {/* Jadval + boshqaruvlar */}
      <div className="overflow-x-auto bg-white shadow-xl rounded-2xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            👦 Sessiyalar ro‘yxati
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-2 rounded-lg border bg-gray-50 text-sm">
              Oxirgi skan: <b>{lastCode || "—"}</b>
            </span>

            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="🔎 Token / ID qidirish"
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">Hamma</option>
              <option value="inside">Ichkarida</option>
              <option value="done">Tugagan</option>
            </select>

            <button
              onClick={
                audioEnabled ? () => setAudioEnabled(false) : enableSound
              }
              className={`px-3 py-2 rounded-lg text-white shadow transition ${
                audioEnabled
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-500 hover:bg-gray-600"
              }`}
              title="2 daqiqa qolganda beep"
            >
              🔔 {audioEnabled ? "Ovoz ON" : "Ovoz OFF"}
            </button>

            <button
              onClick={exportToExcel}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow hover:bg-yellow-600 transition"
            >
              📥 Excelga saqlash
            </button>
          </div>
        </div>

        <table className="min-w-full table-auto text-left border-collapse">
          <thead className="bg-gradient-to-r from-blue-100 to-purple-100 text-gray-700">
            <tr>
              <th className="p-3 text-sm font-semibold">Token / ID</th>
              <th className="p-3 text-sm font-semibold">Kirish</th>
              <th className="p-3 text-sm font-semibold">Chiqish</th>
              <th className="p-3 text-sm font-semibold">Qolgan / Qo‘shimcha</th>
              <th className="p-3 text-sm font-semibold">To‘lov (so‘m)</th>
              <th className="p-3 text-sm font-semibold">Amal</th>
            </tr>
          </thead>

          <tbody>
            {paginatedChildren.map((child, idx) => {
              const isOverdue =
                !child.exit_time && countdowns[child._id] === "⏳ Vaqt tugadi!";
              return (
                <tr
                  key={child._id}
                  className={`transition hover:shadow-md ${
                    isOverdue
                      ? "bg-red-50"
                      : idx % 2 === 0
                      ? "bg-gray-50"
                      : "bg-white"
                  }`}
                >
                  <td className="p-3 font-medium">
                    {child.token_code || child.qr_code || child._id}
                  </td>

                  <td className="p-3 text-green-600 font-semibold">
                    {child.entry_time
                      ? new Date(child.entry_time).toLocaleTimeString()
                      : "-"}
                  </td>

                  <td className="p-3 text-red-500 font-semibold">
                    {child.exit_time
                      ? new Date(child.exit_time).toLocaleTimeString()
                      : "🚸 Hali ichkarida"}
                  </td>

                  <td className="p-3 text-center">
                    {!child.exit_time &&
                      countdowns[child._id] !== "⏳ Vaqt tugadi!" && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          {countdowns[child._id]}
                        </span>
                      )}
                    {!child.exit_time &&
                      countdowns[child._id] === "⏳ Vaqt tugadi!" && (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                          {extraMinutes[child._id]} min
                        </span>
                      )}
                    {child.exit_time && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        Chiqib ketgan
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-center font-medium">
                    {!child.exit_time
                      ? child.paid_amount
                        ? child.paid_amount.toLocaleString()
                        : baseCost.toLocaleString()
                      : child.paid_amount?.toLocaleString() || 0}
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {!child.exit_time ? (
                        <>
                          <button
                            onClick={() => extend(child._id, 30)}
                            className="px-2 py-1 text-xs bg-amber-500 text-white rounded"
                            title="30 daqiqa qo‘shish"
                          >
                            +30m
                          </button>
                          <button
                            onClick={() => extend(child._id, 60)}
                            className="px-2 py-1 text-xs bg-amber-600 text-white rounded"
                            title="1 soat qo‘shish"
                          >
                            +60m
                          </button>
                          <button
                            onClick={() => checkout(child._id)}
                            className="px-2 py-1 text-xs bg-rose-600 text-white rounded"
                            title="Checkout (yakunlash)"
                          >
                            Checkout
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => reprint(child._id)}
                            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
                            title="Chekni qayta chiqarish"
                          >
                            Chek
                          </button>
                          <Link
                            to={`/child/${child.qr_code}`}
                            className="bg-blue-500 text-white px-3 py-1 rounded-lg shadow hover:bg-blue-600 transition text-xs"
                          >
                            Ko‘rish
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded-lg border ${
                currentPage === i + 1
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
