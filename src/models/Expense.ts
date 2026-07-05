import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  paidBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  isApproved: boolean;
  approvedAt?: Date;
  paymentMethod: "cash" | "bank" | "card";
  receiptImage?: string;
  notes?: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  expenseNumber: { type: String, unique: true },
  category: {
    type: String,
    required: true,
    enum: ["إيجار", "كهرباء", "ماء", "رواتب", "مواصلات", "تسويق", "صيانة", "أخرى"],
  },
  description:   { type: String, required: true },
  amount:        { type: Number, required: true, min: 0 },
  paidBy:        { type: Schema.Types.ObjectId, ref: "User", required: true },
  approvedBy:    { type: Schema.Types.ObjectId, ref: "User" },
  isApproved:    { type: Boolean, default: false },
  approvedAt:    { type: Date },
  paymentMethod: { type: String, enum: ["cash", "bank", "card"], default: "cash" },
  receiptImage:  { type: String },
  notes:         { type: String },
}, { timestamps: true });

ExpenseSchema.pre("validate", async function (next) {
  if (this.isNew && !this.expenseNumber) {
    const count = await mongoose.model("Expense").countDocuments();
    this.expenseNumber = `EXP-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export const Expense = mongoose.model<IExpense>("Expense", ExpenseSchema);
