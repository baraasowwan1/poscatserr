import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  nameAr: string;
  nameEn?: string;
  sku: string;
  barcode: string;
  category: string;
  brand?: string;
  supplier?: mongoose.Types.ObjectId;
  costPrice: number;
  sellPrice: number;
  wholesalePrice?: number;
  stock: number;
  minStock: number;
  unit: string;
  weight?: number;
  location?: string;
  description?: string;
  images: string[];
  status: "active" | "inactive" | "out_of_stock";
  hasVAT: boolean;
  vatRate: number;
  expiryDate?: Date;
  batchNumber?: string;
  storeSlug?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  nameAr:         { type: String, required: true, trim: true, index: true },
  nameEn:         { type: String, trim: true },
  sku:            { type: String, required: true, unique: true, uppercase: true, trim: true },
  barcode:        { type: String, unique: true, sparse: true, trim: true, index: true },
  category:       { type: String, required: true, trim: true, index: true },
  brand:          { type: String, trim: true },
  supplier:       { type: Schema.Types.ObjectId, ref: "Supplier" },
  costPrice:      { type: Number, required: true, min: 0 },
  sellPrice:      { type: Number, required: true, min: 0 },
  wholesalePrice: { type: Number, min: 0 },
  stock:          { type: Number, default: 0, min: 0 },
  minStock:       { type: Number, default: 5, min: 0 },
  unit:           { type: String, default: "قطعة" },
  weight:         { type: Number },
  location:       { type: String },
  description:    { type: String },
  images:         { type: [String], default: [] },
  status: {
    type: String,
    enum: ["active", "inactive", "out_of_stock"],
    default: "active",
  },
  hasVAT:       { type: Boolean, default: true },
  vatRate:      { type: Number, default: 0.16 },
  expiryDate:   { type: Date },
  batchNumber:  { type: String },
  storeSlug:    { type: String, required: false, default: "", index: true },
}, { timestamps: true });

// Auto-update status based on stock
ProductSchema.pre("save", function (next) {
  if (this.isModified("stock")) {
    if (this.stock === 0) this.status = "out_of_stock";
    else if (this.status === "out_of_stock") this.status = "active";
  }
  next();
});

ProductSchema.virtual("profit").get(function () {
  return this.sellPrice - this.costPrice;
});

ProductSchema.virtual("profitMargin").get(function () {
  return this.sellPrice > 0 ? ((this.sellPrice - this.costPrice) / this.sellPrice) * 100 : 0;
});

ProductSchema.index({ nameAr: "text", nameEn: "text", sku: "text", barcode: "text" });

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
