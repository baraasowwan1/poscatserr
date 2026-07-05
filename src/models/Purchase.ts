import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseItem {
  product: mongoose.Types.ObjectId;
  nameAr: string;
  qty: number;
  unitCost: number;
  total: number;
}

export interface IPurchase extends Document {
  poNumber: string;
  supplier: mongoose.Types.ObjectId;
  supplierName: string;
  createdBy: mongoose.Types.ObjectId;
  items: IPurchaseItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  status: "pending" | "approved" | "shipped" | "received" | "cancelled";
  notes?: string;
  receivedAt?: Date;
  receivedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  product:  { type: Schema.Types.ObjectId, ref: "Product", required: true },
  nameAr:   { type: String, required: true },
  qty:      { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 },
  total:    { type: Number, required: true },
}, { _id: false });

const PurchaseSchema = new Schema<IPurchase>({
  poNumber:     { type: String, required: true, unique: true },
  supplier:     { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierName: { type: String, required: true },
  createdBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  items:        { type: [PurchaseItemSchema], required: true },
  subtotal:     { type: Number, required: true },
  vatAmount:    { type: Number, default: 0 },
  grandTotal:   { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "shipped", "received", "cancelled"],
    default: "pending",
  },
  notes:      { type: String },
  receivedAt: { type: Date },
  receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

PurchaseSchema.pre("validate", async function (next) {
  if (this.isNew && !this.poNumber) {
    const count = await mongoose.model("Purchase").countDocuments();
    const year = new Date().getFullYear();
    this.poNumber = `PO-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export const Purchase = mongoose.model<IPurchase>("Purchase", PurchaseSchema);
