// src/components/ScannerListener.jsx
import { useEffect, useRef } from "react";

/**
 * Barcode skan listener:
 * - Faqat raqamli belgilarni yig'adi (default).
 * - Enter/Tab bosilganda, uzunligi (>= minLength) bo'lsa commit qiladi.
 * - Sekin yozilgan qo'l terishlarni chetlab o'tish uchun tezlik filtri bor.
 * - Input/textarea/select/contentEditable fokusi bo'lsa — umuman ishlamaydi.
 */
export default function ScannerListener({
  onScan,
  minLength = 8,
  maxLength = 32,
  numericOnly = true,
  resetMs = 200, // gap > resetMs -> yangi skan deb olinadi
  maxScanDurationMs = 800, // butun skan 800ms ichida tugashi kutiladi
}) {
  const bufferRef = useRef("");
  const lastTsRef = useRef(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const isEditable = (el) => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable === true
      );
    };

    const resetBuffer = () => {
      bufferRef.current = "";
      lastTsRef.current = 0;
      startedAtRef.current = 0;
    };

    const handleKeydown = (e) => {
      // Agar fokus forma elementida bo'lsa — umuman ishlamaymiz
      if (isEditable(e.target)) return;

      const now = Date.now();

      // Commit qilish (Enter/Tab bosilganda)
      if (e.key === "Enter" || e.key === "Tab") {
        const code = bufferRef.current;
        const duration = startedAtRef.current
          ? now - startedAtRef.current
          : Infinity;

        // Bufferni birdan tozalaymiz
        resetBuffer();

        if (!code) return; // bo'sh buffer
        if (code.length < minLength || code.length > maxLength) return;
        if (numericOnly && !/^\d+$/.test(code)) return;
        if (duration > maxScanDurationMs) return; // juda sekin terilgan

        // Skaner Enter/TAB yuborgan bo'lsa fokus siljimasin
        if (e.key === "Tab") e.preventDefault();

        try {
          onScan && onScan(code);
        } catch (_) {}
        return;
      }

      // Esc — bekor qilish
      if (e.key === "Escape") {
        resetBuffer();
        return;
      }

      // Faqat bitta belgili klavishlar (harflar/raqamlar) — qolganini e'tiborsiz qoldiramiz
      if (e.key.length !== 1) return;

      // Faqat raqamga ruxsat (barcode ko'pincha 8–20 raqam)
      if (numericOnly && !/[0-9]/.test(e.key)) return;

      // Juda katta pauza bo'lsa — yangi skan
      if (now - lastTsRef.current > resetMs) {
        bufferRef.current = "";
        startedAtRef.current = now;
      }

      // Belgini qo'shamiz
      bufferRef.current += e.key;
      lastTsRef.current = now;

      // Juda uzun bo'lib ketmasin
      if (bufferRef.current.length > maxLength) {
        resetBuffer();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onScan, minLength, maxLength, numericOnly, resetMs, maxScanDurationMs]);

  return null;
}
