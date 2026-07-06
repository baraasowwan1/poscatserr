import mongoose, { Document, Schema } from "mongoose";

export interface ITenantStore extends Document {
  storeId: string;
  slug: string;
  name: string;
  sector: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  logo: string;
  taxNumber: string;
  currency: string;
  timezone: string;
  planId: string;
  status: "active" | "inactive" | "suspended" | "trial";
  maxUsers: number;
  maxProducts: number;
  maxBranches: number;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  createdAt: Date;
}

const TenantStoreSchema = new Schema<ITenantStore>({
  storeId:            { type: String, required: true, unique: true },
  slug:               { type: String, required: true, unique: true, trim: true, lowercase: true },
  name:               { type: String, required: true },
  sector:             { type: String, default: "supermarket", enum: ["supermarket","restaurant","pharmacy","clothing","cafe","electronics","salon","bakery"] },
  ownerName:          { type: String, required: true },
  phone:              { type: String, default: "" },
  email:              { type: String, default: "" },
  address:            { type: String, default: "" },
  logo:               { type: String, default: "" },
  taxNumber:          { type: String, default: "" },
  currency:           { type: String, default: "JOD" },
  timezone:           { type: String, default: "Asia/Amman" },
  planId:             { type: String, required: true },
  status:             { type: String, enum: ["active","inactive","suspended","trial"], default: "trial" },
  maxUsers:           { type: Number, default: 3 },
  maxProducts:        { type: Number, default: 500 },
  maxBranches:        { type: Number, default: 1 },
  trialEndsAt:        { type: Date },
  subscriptionEndsAt: { type: Date },
}, { timestamps: true });

export default mongoose.model<ITenantStore>("TenantStore", TenantStoreSchema);
