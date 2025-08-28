import React from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRCodeDisplay({ qrCode }) {
  return <QRCodeSVG value={qrCode} size={80} />;
}
