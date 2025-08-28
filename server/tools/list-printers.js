// tools/list-printers.js
import pkg from "pdf-to-printer";
const { getPrinters } = pkg;

const printers = await getPrinters();
console.log(printers);
