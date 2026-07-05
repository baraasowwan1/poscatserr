import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxNumber: string;
  logo?: string;
  invoiceLogo?: string;
  currency: string;
  vatRate: number;
  timezone: string;
  language: "ar" | "en";
  invoiceFooter: string;
  receiptWidth: "58mm" | "80mm";
  receiptCopies: number;
  enableLoyalty: boolean;
  loyaltyRate: number;
  enableVAT: boolean;
  paymentMethods: string[];
  lowStockAlert: number;
}

const SettingsSchema = new Schema<ISettings>({
  companyName:    { type: String, default: "سوبرماركت البيع الذكي" },
  companyAddress: { type: String, default: "عمّان، الأردن" },
  companyPhone:   { type: String, default: "065123456" },
  companyEmail:   { type: String, default: "info@supermarket.jo" },
  taxNumber:      { type: String, default: "" },
  logo:           { type: String },
  invoiceLogo:    { type: String },
  currency:       { type: String, default: "JOD" },
  vatRate:        { type: Number, default: 0.16 },
  timezone:       { type: String, default: "Asia/Amman" },
  language:       { type: String, enum: ["ar", "en"], default: "ar" },
  invoiceFooter:  { type: String, default: "شكراً لتسوقكم معنا" },
  receiptWidth:   { type: String, enum: ["58mm", "80mm"], default: "80mm" },
  receiptCopies:  { type: Number, default: 1 },
  enableLoyalty:  { type: Boolean, default: true },
  loyaltyRate:    { type: Number, default: 0.01 },
  enableVAT:      { type: Boolean, default: true },
  paymentMethods: { type: [String], default: ["cash", "card", "cliq", "bank"] },
  lowStockAlert:  { type: Number, default: 5 },
}, { timestamps: true });

export const Settings = mongoose.model<ISettings>("Settings", SettingsSchema);
