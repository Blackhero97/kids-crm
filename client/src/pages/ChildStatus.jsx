// pages/ChildStatus.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function ChildStatus() {
  const { qr_code } = useParams();
  const [child, setChild] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/children/qr/${qr_code}`)
      .then((res) => res.json())
      .then((data) => setChild(data))
      .catch((err) => console.error("❌ Xato:", err));
  }, [qr_code]);

  if (!child) return <p>⏳ Yuklanmoqda...</p>;

  // ⏰ Qolgan vaqtni hisoblash
  let remaining = null;
  if (child.paid_until) {
    const diff = new Date(child.paid_until) - new Date();
    if (diff > 0) {
      remaining = Math.ceil(diff / 1000 / 60); // minutlarda
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md text-center">
      <h1 className="text-2xl font-bold mb-2">{child.name}</h1>
      <p>👨‍👩‍👧 Ota-ona: {child.parent_name}</p>
      <p>⏰ Kirgan: {new Date(child.entry_time).toLocaleString()}</p>

      {remaining ? (
        <p className="text-green-600 font-semibold">
          Qolgan vaqt: {remaining} daqiqa
        </p>
      ) : (
        <p className="text-red-600 font-semibold">Vaqt tugagan ⌛</p>
      )}

      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow"
        onClick={() =>
          alert("⏳ Vaqtni davom ettirish funksiyasi keyin ulanadi")
        }
      >
        ⏰ Davom ettirish
      </button>
    </div>
  );
}

export default ChildStatus;
