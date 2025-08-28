// src/lib/api.js
// Barcha API chaqiriqlar shu instans orqali /api ga yuboriladi.
// Devda Vite proxy backendga uzatadi (vite.config.js -> server.proxy).

import axios from "axios";

// Dev: /api (proxy). Prod: VITE_API_URL berilsa o‘shandan.
const baseURL =
  import.meta.env.PROD && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/+$/, "") // trailing slashni olib tashlash
    : "/api";

const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: false, // cookie ishlatmasak false
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Kichik retry: faqat network error (server javobi yo‘q) bo‘lsa, 2 marta qayta urinish
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response) return Promise.reject(error);
    const cfg = error.config || {};
    cfg.__retryCount = (cfg.__retryCount || 0) + 1;
    if (cfg.__retryCount <= 2) {
      const backoff = 400 * cfg.__retryCount; // 400ms, so‘ng 800ms
      await new Promise((r) => setTimeout(r, backoff));
      return api(cfg);
    }
    return Promise.reject(error);
  }
);

// Qulaylik uchun data qaytaradigan o‘rama
const dataOf = (p) => p.then((r) => r.data);

// --- Children / Sessions endpointlari ---
export const childrenApi = {
  list: () => dataOf(api.get(`/children`)),
  byQr: (qr) => dataOf(api.get(`/children/qr/${encodeURIComponent(qr)}`)),
  byCode: (code) =>
    dataOf(api.get(`/children/by-code/${encodeURIComponent(code)}`)),
  scan: (token) =>
    dataOf(api.get(`/children/scan/${encodeURIComponent(token)}`)), // check-in/out toggle
  checkout: (id, extraMinutes = 0) =>
    dataOf(api.put(`/children/checkout/${id}`, { extraMinutes })),
  extend: (id, minutes = 60) =>
    dataOf(api.put(`/children/extend/${id}`, { minutes })),
  historyByToken: (token) =>
    dataOf(api.get(`/children/history/${encodeURIComponent(token)}`)),
  reprint: (id) => dataOf(api.post(`/children/${id}/reprint`)), // ixtiyoriy
};

// --- Hisobotlar (agar qo‘shgan bo‘lsak /api/reports/daily) ---
export const reportsApi = {
  daily: () => dataOf(api.get(`/reports/daily`)),
};

// Asosiy instansni ham eksport qilib qo‘yamiz (kerak bo‘lsa)
export default api;
