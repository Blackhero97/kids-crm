// ⏰ Bola qancha vaqt o‘ynaganini aniq minutlar asosida hisoblaymiz
export const calculatePayment = (entry_time, exit_time) => {
  const start = new Date(entry_time);
  const end = new Date(exit_time);

  const diffMs = end - start; // millisekundlarda farq
  const minutes = diffMs / (1000 * 60); // daqiqaga o'tkazamiz

  const ratePerMinute = 50000 / 60; // har daqiqa uchun
  const payment = Math.ceil(minutes * ratePerMinute); // jami to‘lov

  return payment;
};
