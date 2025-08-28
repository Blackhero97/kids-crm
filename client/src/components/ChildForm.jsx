import { useState } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import Swal from "sweetalert2";

export default function ChildForm({ onAdded }) {
  const [form, setForm] = useState({
    name: "",
    parent_name: "",
    paid_hours: "",
  });
  const [qrCode, setQrCode] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/children", form);
      setForm({ name: "", parent_name: "", paid_hours: "" });

      setQrCode(res.data.qr_code);

      Swal.fire({
        icon: "success",
        title: "✅ Bola qo‘shildi!",
        text: `${res.data.name} muvaffaqiyatli qo‘shildi.`,
        timer: 2000,
        showConfirmButton: false,
      });

      onAdded();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Xatolik!",
        text: "Bola qo‘shishda muammo yuz berdi.",
      });
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl border border-gray-200 p-8">
      <h3 className="text-2xl font-bold mb-6 text-gray-800">
        ➕ Yangi bola qo‘shish
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Bola ismi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bola ismi
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Masalan: Ali"
            className="w-full border border-gray-300 rounded-lg shadow-sm p-3 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              hover:border-indigo-400 transition"
            required
          />
        </div>

        {/* Ota-ona ismi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ota-ona ismi
          </label>
          <input
            type="text"
            name="parent_name"
            value={form.parent_name}
            onChange={handleChange}
            placeholder="Masalan: Akmal aka"
            className="w-full border border-gray-300 rounded-lg shadow-sm p-3 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              hover:border-indigo-400 transition"
            required
          />
        </div>

        {/* Oldindan to‘langan soat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Oldindan to‘langan soat (ixtiyoriy)
          </label>
          <input
            type="number"
            name="paid_hours"
            value={form.paid_hours}
            onChange={handleChange}
            placeholder="Masalan: 2"
            className="w-full border border-gray-300 rounded-lg shadow-sm p-3 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              hover:border-indigo-400 transition"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold 
            hover:bg-indigo-700 active:scale-[0.98] transition shadow-md"
        >
          Qo‘shish
        </button>
      </form>

      {/* QR Code */}
      {qrCode && (
        <div className="mt-8 p-6 bg-gray-50 border rounded-xl text-center">
          <p className="mb-3 font-medium text-gray-700">
            📱 Ushbu QR code ota-onaga yuboring:
          </p>
          <QRCodeCanvas
            value={`${window.location.origin}/child/${qrCode}`}
            size={160}
            className="p-3 bg-white rounded-lg shadow border"
          />
          <p className="text-sm mt-3 text-gray-600 break-all">
            {window.location.origin}/child/{qrCode}
          </p>
        </div>
      )}
    </div>
  );
}
