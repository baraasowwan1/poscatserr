import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  loyaltyPoints: number;
  totalPurchases: number;
  totalVisits: number;
  discountLevel: number;
  status: "active" | "inactive" | "vip" | "premium";
  creditBalance: number;
  debtBalance: number;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  name:           { type: String, required: true, trim: true, index: true },
  phone:          { type: String, required: true, unique: true, trim: true },
  email:          { type: String, lowercase: true, trim: true },
  address:        { type: String },
  city:           { type: String },
  notes:          { type: String },
  loyaltyPoints:  { type: Number, default: 0, min: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalVisits:    { type: Number, default: 0 },
  discountLevel:  { type: Number, default: 0, min: 0, max: 100 },
  status: {
    type: String,
    enum: ["active", "inactive", "vip", "premium"],
    default: "active",
  },
  creditBalance: { type: Number, default: 0 },
  debtBalance:   { type: Number, default: 0 },
}, { timestamps: true });

CustomerSchema.index({ name: "text", phone: "text" });

export const Customer = mongoose.model<ICustomer>("Customer", CustomerSchema);
