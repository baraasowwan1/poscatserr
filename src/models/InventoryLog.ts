import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryLog extends Document {
  product: mongoose.Types.ObjectId;
  productName: string;
  type: "in" | "out" | "adjustment" | "sale" | "purchase" | "return" | "damaged";
  qty: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string;
  reason?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryLogSchema = new Schema<IInventoryLog>({
  product:     { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  productName: { type: String, required: true },
  type: {
    type: String,
    enum: ["in", "out", "adjustment", "sale", "purchase", "return", "damaged"],
    required: true,
  },
  qty:         { type: Number, required: true },
  stockBefore: { type: Number, required: true },
  stockAfter:  { type: Number, required: true },
  reference:   { type: String },
  reason:      { type: String },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const InventoryLog = mongoose.model<IInventoryLog>("InventoryLog", InventoryLogSchema);
