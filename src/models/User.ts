import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;         // login username (e.g. "admin", "cashier1")
  password: string;
  role: string;             // "مالك المنصة" | "مدير النظام" | "مدير" | "كاشير" | "موظف مخزون"
  permissions: string[] | number;
  status: "نشط" | "غير نشط";
  storeSlug: string;        // which store this user belongs to (empty = platform owner)
  lastLogin?: Date;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  matchPassword(entered: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  username:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true, minlength: 4 },
  role:        { type: String, default: "كاشير" },
  permissions: { type: Schema.Types.Mixed, default: 3 },
  status:      { type: String, enum: ["نشط", "غير نشط"], default: "نشط" },
  storeSlug:   { type: String, default: "" },
  lastLogin:   { type: Date },
  avatar:      { type: String, default: "" },
  phone:       { type: String, default: "" },
}, { timestamps: true });

// Hash password before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (entered: string): Promise<boolean> {
  return bcrypt.compare(entered, this.password);
};

UserSchema.index({ storeSlug: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
