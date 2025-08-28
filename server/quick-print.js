// quick-print.js
import escpos from "escpos";
import USB from "escpos-usb";

escpos.USB = USB;

// Agar kerak bo‘lsa ID yozing: new escpos.USB(0xXXXX, 0xYYYY)
const device = new escpos.USB();

const printer = new escpos.Printer(device, { encoding: "CP437" }); // yoki "GB18030" / "CP866"

device.open((err) => {
  if (err) {
    console.error("USB open error:", err);
    process.exit(1);
  }

  printer
    .align("CT")
    .style("B")
    .size(1, 1)
    .text("KIDS CRM")
    .style("NORMAL")
    .text("Test Chek")
    .drawLine()
    .align("LT")
    .text("Jeton: 123456")
    .text("Jami: 50,000 so'm")
    .drawLine()
    .align("CT")
    .text(new Date().toLocaleString("uz-UZ"))
    .newline()
    .cut()
    .close();
});

// Qulaylik uchun:
escpos.Printer.prototype.drawLine = function () {
  this.text("--------------------------------");
  return this;
};
