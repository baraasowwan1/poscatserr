import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  taxNumber?: string;
  notes?: string;
  balance: number;
  status: "active" | "inactive" | "suspended";
  totalPurchases: number;
  storeSlug?: string;
  createdAt: Date;
}

const SupplierSchema = new Schema<ISupplier>({
  name:          { type: String, required: true, trim: true, index: true },
  contactPerson: { type: String, trim: true },
  phone:         { type: String, required: true, trim: true },
  email:         { type: String, lowercase: true, trim: true },
  address:       { type: String },
  city:          { type: String },
  taxNumber:     { type: String },
  notes:         { type: String },
  balance:       { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },
  totalPurchases: { type: Number, default: 0 },
  storeSlug:      { type: String, required: false, default: "", index: true },
}, { timestamps: true });

export const Supplier = mongoose.model<ISupplier>("Supplier", SupplierSchema);
