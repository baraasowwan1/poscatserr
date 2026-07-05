// Run once after deployment: pnpm seed
// Seeds: platform owner, plans, default settings

import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Settings } from "../models/Settings";
import Plan from "../models/Plan";
import bcrypt from "bcryptjs";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set in .env");

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB:", mongoose.connection.host);

  // ── Plans ──────────────────────────────────────────────────────────────────
  const plans = [
    {
      _id: new mongoose.Types.ObjectId("000000000000000000000001"),
      name: "Starter",
      nameAr: "المبتدئ",
      price: 29,
      billingCycle: "monthly",
      maxUsers: 3,
      maxProducts: 500,
      maxBranches: 1,
      features: ["نقطة بيع", "تقارير أساسية", "إدارة منتجات"],
      color: "bg-slate-500",
      active: true,
    },
    {
      _id: new mongoose.Types.ObjectId("000000000000000000000002"),
      name: "Business",
      nameAr: "الأعمال",
      price: 79,
      billingCycle: "monthly",
      maxUsers: 10,
      maxProducts: 5000,
      maxBranches: 3,
      features: ["كل مميزات المبتدئ", "تقارير متقدمة", "إدارة موردين وعملاء", "دعم أولوية"],
      color: "bg-blue-500",
      popular: true,
      active: true,
    },
    {
      _id: new mongoose.Types.ObjectId("000000000000000000000003"),
      name: "Enterprise",
      nameAr: "المؤسسات",
      price: 199,
      billingCycle: "monthly",
      maxUsers: 999,
      maxProducts: 999999,
      maxBranches: 999,
      features: ["كل المميزات", "متعدد الفروع", "API مخصص", "مدير حساب مخصص", "تدريب وإعداد"],
      color: "bg-purple-500",
      active: true,
    },
  ];

  for (const plan of plans) {
    await Plan.findOneAndUpdate({ name: plan.name }, plan, { upsert: true, new: true });
  }
  console.log("✅ Plans seeded (3 plans)");

  // ── Default Settings ───────────────────────────────────────────────────────
  const settingsExists = await Settings.findOne();
  if (!settingsExists) {
    await Settings.create({
      companyName: "SOWWAN POS",
      currency: "JOD",
      vatRate: 16,
      timezone: "Asia/Amman",
    });
    console.log("✅ Default settings created");
  } else {
    console.log("ℹ️  Settings already exist");
  }

  // ── Platform Superadmin ────────────────────────────────────────────────────
  const adminExists = await User.findOne({ username: "superadmin" });
  if (!adminExists) {
    const hashed = await bcrypt.hash("SuperAdmin@2026", 12);
    await User.create({
      name: "مالك المنصة",
      email: "superadmin@platform.io",
      username: "superadmin",
      password: hashed,
      role: "مالك المنصة",
      permissions: ["*"],
      status: "نشط",
      storeId: null,
    });
    console.log("✅ Platform owner created");
    console.log("   Username : superadmin");
    console.log("   Password : SuperAdmin@2026");
  } else {
    console.log("ℹ️  Platform owner already exists");
  }

  await mongoose.disconnect();
  console.log("\n🎉 Seed complete! Ready for deployment.");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
