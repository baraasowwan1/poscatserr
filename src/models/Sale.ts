import mongoose, { Schema, Document } from "mongoose";

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  nameAr: string;
  barcode: string;
  qty: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  total: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  customer?: mongoose.Types.ObjectId;
  customerName?: string;
  cashier: mongoose.Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  totalDiscount: number;
  vatAmount: number;
  grandTotal: number;
  paymentMethod: "cash" | "card" | "cliq" | "bank" | "usdt" | "gift" | "mixed";
  cashGiven?: number;
  changeGiven?: number;
  status: "completed" | "pending" | "refunded" | "cancelled";
  notes?: string;
  refundReason?: string;
  storeSlug?: string;
  createdAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>({
  product:   { type: Schema.Types.ObjectId, ref: "Product", required: true },
  nameAr:    { type: String, required: true },
  barcode:   { type: String },
  qty:       { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount:  { type: Number, default: 0, min: 0, max: 100 },
  vatRate:   { type: Number, default: 0.16 },
  total:     { type: Number, required: true },
}, { _id: false });

const SaleSchema = new Schema<ISale>({
  invoiceNumber: { type: String, required: true, unique: true },
  customer:      { type: Schema.Types.ObjectId, ref: "Customer" },
  customerName:  { type: String },
  cashier:       { type: Schema.Types.ObjectId, ref: "User", required: true },
  items:         { type: [SaleItemSchema], required: true },
  subtotal:      { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  vatAmount:     { type: Number, default: 0 },
  grandTotal:    { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "cliq", "bank", "usdt", "gift", "mixed"],
    required: true,
  },
  cashGiven:    { type: Number },
  changeGiven:  { type: Number },
  status: {
    type: String,
    enum: ["completed", "pending", "refunded", "cancelled"],
    default: "completed",
  },
  notes:        { type: String },
  refundReason: { type: String },
  storeSlug:    { type: String, required: false, default: "", index: true },
}, { timestamps: true });

// Auto-generate invoice number
SaleSchema.pre("validate", async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model("Sale").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const seq = String(count + 1).padStart(4, "0");
    this.invoiceNumber = `INV-${year}-${seq}`;
  }
  next();
});

export const Sale = mongoose.model<ISale>("Sale", SaleSchema);
