import mongoose, { Document, Schema } from "mongoose";

export interface IPlan extends Document {
  name: string;
  nameAr: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  maxUsers: number;
  maxProducts: number;
  maxBranches: number;
  features: string[];
  color: string;
  popular: boolean;
  active: boolean;
}

const PlanSchema = new Schema<IPlan>({
  name:         { type: String, required: true },
  nameAr:       { type: String, required: true },
  price:        { type: Number, required: true },
  billingCycle: { type: String, enum: ["monthly","yearly"], default: "monthly" },
  maxUsers:     { type: Number, default: 3 },
  maxProducts:  { type: Number, default: 500 },
  maxBranches:  { type: Number, default: 1 },
  features:     [{ type: String }],
  color:        { type: String, default: "bg-slate-500" },
  popular:      { type: Boolean, default: false },
  active:       { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IPlan>("Plan", PlanSchema);
