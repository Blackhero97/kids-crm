import mongoose from "mongoose";

const childSchema = new mongoose.Schema(
  {
    token_code: { type: String, trim: true, default: null },
    qr_code: { type: String, unique: true, sparse: true },

    entry_time: { type: Date, default: Date.now },
    exit_time: { type: Date },

    // to'lovlar
    paid_amount: { type: Number, default: 0 },
    paid_until: { type: Date },

    // 🆕 chek uchun: kirishda qo'llangan bazaviy narxni saqlaymiz
    base_amount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// (ixtiyoriy) tezlik uchun indekslar
childSchema.index({ entry_time: -1 });
childSchema.index({ exit_time: 1 });
childSchema.index({ token_code: 1 });

export default mongoose.model("Child", childSchema);
