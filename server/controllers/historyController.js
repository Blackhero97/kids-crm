// controllers/historyController.js
import History from "../models/History.js";
import Child from "../models/Child.js";

/**
 * Kichik yordamchilar
 */
const toDate = (v) => (v instanceof Date ? v : new Date(v));
const clampNum = (x, a, b) => Math.max(a, Math.min(b, x));

function startOfDay(d) {
  const x = toDate(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0);
}
function endOfDay(d) {
  const x = toDate(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 23, 59, 59, 999);
}
function ceilMinutes(ms) {
  return Math.ceil(Math.max(0, ms) / 60000);
}

/**
 * /api/history
 * Query:
 *  - token: string (ixtiyoriy)
 *  - date: YYYY-MM-DD (ixtiyoriy) — berilsa shu kun kesimida
 *  - from, to: YYYY-MM-DD (ixtiyoriy) — oraliq bo'yicha
 *  - page, limit: pagination
 */
export async function listHistory(req, res) {
  try {
    const { token, date, from, to, page = 1, limit = 50 } = req.query;

    const q = {};
    if (token) q.token_code = token;

    // Vaqt filtrlari
    if (date) {
      q.exit_time = { $gte: startOfDay(date), $lte: endOfDay(date) };
    } else if (from || to) {
      q.exit_time = {};
      if (from) q.exit_time.$gte = startOfDay(from);
      if (to) q.exit_time.$lte = endOfDay(to);
    }

    const p = clampNum(Number(page) || 1, 1, 10_000);
    const l = clampNum(Number(limit) || 50, 1, 1000);

    const [items, total] = await Promise.all([
      History.find(q)
        .sort({ exit_time: -1, entry_time: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      History.countDocuments(q),
    ]);

    // Hisob-kitoblar
    const totals = items.reduce(
      (acc, x) => {
        const enter = x.entry_time ? new Date(x.entry_time) : null;
        const exit = x.exit_time ? new Date(x.exit_time) : null;
        if (enter && exit) {
          acc.totalMinutes += ceilMinutes(exit - enter);
        }
        acc.totalAmount += Number(x.paid_amount || 0);
        return acc;
      },
      { totalAmount: 0, totalMinutes: 0 }
    );

    res.json({
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
      totals,
      items,
    });
  } catch (err) {
    console.error("❌ listHistory xato:", err.message);
    res.status(500).json({ error: "Server xatosi: " + err.message });
  }
}

/**
 * /api/history/daily?date=YYYY-MM-DD
 * Kunlik hisobot
 */
export async function getDailyReport(req, res) {
  try {
    const date = req.query.date || new Date();
    const start = startOfDay(date);
    const end = endOfDay(date);

    const items = await History.find({
      exit_time: { $gte: start, $lte: end },
    })
      .sort({ exit_time: -1 })
      .lean();

    const totalCount = items.length;
    const totalAmount = items.reduce(
      (s, x) => s + (Number(x.paid_amount) || 0),
      0
    );
    const totalMinutes = items.reduce((s, x) => {
      if (x.entry_time && x.exit_time) {
        return s + ceilMinutes(new Date(x.exit_time) - new Date(x.entry_time));
      }
      return s;
    }, 0);

    res.json({
      date: start.toISOString().slice(0, 10),
      totalCount,
      totalAmount,
      totalMinutes,
      items,
    });
  } catch (err) {
    console.error("❌ getDailyReport xato:", err.message);
    res.status(500).json({ error: "Server xatosi: " + err.message });
  }
}

/**
 * /api/history/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Oraliq bo'yicha hisobot
 */
export async function getRangeReport(req, res) {
  try {
    const { from, to } = req.query;
    if (!from && !to) {
      return res.status(400).json({ error: "from yoki to berilishi kerak" });
    }
    const start = from ? startOfDay(from) : new Date(0);
    const end = to ? endOfDay(to) : new Date();

    const items = await History.find({
      exit_time: { $gte: start, $lte: end },
    })
      .sort({ exit_time: -1 })
      .lean();

    const totalCount = items.length;
    const totalAmount = items.reduce(
      (s, x) => s + (Number(x.paid_amount) || 0),
      0
    );
    const totalMinutes = items.reduce((s, x) => {
      if (x.entry_time && x.exit_time) {
        return s + ceilMinutes(new Date(x.exit_time) - new Date(x.entry_time));
      }
      return s;
    }, 0);

    res.json({
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      totalCount,
      totalAmount,
      totalMinutes,
      items,
    });
  } catch (err) {
    console.error("❌ getRangeReport xato:", err.message);
    res.status(500).json({ error: "Server xatosi: " + err.message });
  }
}

/**
 * /api/history/by-session/:id
 * Bitta sessiya tarixini ko'rish
 */
export async function getBySession(req, res) {
  try {
    const { id } = req.params;
    const item = await History.findOne({ sessionId: id }).lean();
    if (!item) return res.status(404).json({ error: "Tarix topilmadi" });
    res.json(item);
  } catch (err) {
    console.error("❌ getBySession xato:", err.message);
    res.status(500).json({ error: "Server xatosi: " + err.message });
  }
}

/**
 * /api/history/backfill/:id
 * History yo'q yoki noto'g'ri bo'lsa, Child ma'lumotidan qayta yaratish
 */
export async function backfillHistory(req, res) {
  try {
    const { id } = req.params;
    const child = await Child.findById(id);
    if (!child) return res.status(404).json({ error: "Child topilmadi" });

    const payload = {
      sessionId: child._id,
      token_code: child.token_code || undefined, // checkoutda null bo'lgani mumkin
      entry_time: child.entry_time || undefined,
      exit_time: child.exit_time || undefined,
      paid_amount: child.paid_amount || 0,
      name: child.name || undefined,
    };

    // upsert
    const updated = await History.findOneAndUpdate(
      { sessionId: child._id },
      { $set: payload },
      { upsert: true, new: true }
    );

    res.json({ ok: true, history: updated });
  } catch (err) {
    console.error("❌ backfillHistory xato:", err.message);
    res.status(500).json({ error: "Server xatosi: " + err.message });
  }
}
