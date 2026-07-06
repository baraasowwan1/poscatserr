import { Router, Request, Response } from "express";
import TenantStore from "../models/TenantStore";
import Plan from "../models/Plan";
import AuditLog from "../models/AuditLog";
import { User } from "../models/User";
import { protect } from "../middleware/auth";

const router = Router();

// Apply protect to ALL platform routes first
router.use(protect as any);

// ─── Middleware: platform-only guard ─────────────────────────────────────────
function platformOnly(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user || user.role !== "مالك المنصة") {
    return res.status(403).json({ success: false, message: "هذا المسار خاص بمالك المنصة فقط" });
  }
  next();
}

// ─── Stores ───────────────────────────────────────────────────────────────────
router.get("/stores", platformOnly, async (_req, res) => {
  const stores = await TenantStore.find().sort({ createdAt: -1 });
  res.json({ success: true, data: stores });
});

router.post("/stores", platformOnly, async (req, res) => {
  try {
    // Support both ObjectId and name-based planId (e.g. "starter", "business")
    const mongoose = (await import("mongoose")).default;
    const planQuery = mongoose.isValidObjectId(req.body.planId)
      ? { _id: req.body.planId }
      : { name: new RegExp(req.body.planId, "i") };
    const plan = await Plan.findOne(planQuery);
    const slug = req.body.slug || `store-${Date.now()}`;

    // 1. Create store
    const store = await TenantStore.create({
      ...req.body,
      slug,
      storeId: `store_${Date.now()}`,
      maxUsers:    plan?.maxUsers    ?? 3,
      maxProducts: plan?.maxProducts ?? 500,
      maxBranches: plan?.maxBranches ?? 1,
      status: "trial",
      trialEndsAt: new Date(Date.now() + 14 * 864e5),
    });

    // 2. Create admin user — ensure unique username/email by appending slug suffix
    let adminUser = null;
    let adminError = null;
    if (req.body.adminUsername && req.body.adminPassword) {
      // Try with original username first, then with slug suffix if conflict
      const candidates = [
        req.body.adminUsername.toLowerCase(),
        `${req.body.adminUsername.toLowerCase()}_${slug.replace(/-/g,"").slice(0,6)}`,
        `admin_${slug.replace(/-/g,"").slice(0,10)}`,
        `admin_${Date.now().toString().slice(-6)}`,
      ];

      for (const uname of candidates) {
        try {
          adminUser = await User.create({
            name:       req.body.ownerName || uname,
            email:      `${uname}@${slug}.pos`,
            username:   uname,
            password:   req.body.adminPassword,
            role:       "مدير النظام",
            permissions: 8,
            storeSlug:  slug,
            status:     "نشط",
          });
          break; // success — stop trying
        } catch (e: any) {
          adminError = e.message;
          if (!e.message?.includes("duplicate") && !e.message?.includes("E11000")) break;
          // E11000 = duplicate key — try next candidate
        }
      }
    }

    res.status(201).json({
      success: true,
      data: store,
      adminCreated: !!adminUser,
      adminUsername: adminUser ? (adminUser as any).username : null,
      adminError: adminUser ? null : adminError,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "فشل إنشاء المتجر" });
  }
});

router.put("/stores/:id", platformOnly, async (req, res) => {
  const store = await TenantStore.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!store) return res.status(404).json({ success: false, message: "المتجر غير موجود" });
  res.json({ success: true, data: store });
});

router.patch("/stores/:id/status", platformOnly, async (req, res) => {
  const { status } = req.body as { status: string };
  const store = await TenantStore.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json({ success: true, data: store });
});

router.delete("/stores/:id", platformOnly, async (req, res) => {
  await TenantStore.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "تم حذف المتجر" });
});

// ─── Platform Stats ───────────────────────────────────────────────────────────
router.get("/stats", platformOnly, async (_req, res) => {
  const [totalStores, activeStores, trialStores, suspendedStores, plans] = await Promise.all([
    TenantStore.countDocuments(),
    TenantStore.countDocuments({ status: "active" }),
    TenantStore.countDocuments({ status: "trial" }),
    TenantStore.countDocuments({ status: "suspended" }),
    Plan.find({ active: true }),
  ]);
  res.json({ success: true, data: { totalStores, activeStores, trialStores, suspendedStores, plansCount: plans.length } });
});

// ─── Plans ────────────────────────────────────────────────────────────────────
router.get("/plans", async (_req, res) => {
  const plans = await Plan.find({ active: true });
  res.json({ success: true, data: plans });
});

router.post("/plans", platformOnly, async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json({ success: true, data: plan });
});

router.put("/plans/:id", platformOnly, async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ success: false, message: "الخطة غير موجودة" });
  res.json({ success: true, data: plan });
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get("/audit", platformOnly, async (req, res) => {
  const { storeId, limit = 100 } = req.query;
  const filter = storeId ? { storeId } : {};
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
  res.json({ success: true, data: logs });
});

// ─── Impersonate token generation ─────────────────────────────────────────────
router.post("/impersonate/:storeId", platformOnly, async (req, res) => {
  const store = await TenantStore.findOne({ storeId: req.params.storeId });
  if (!store) return res.status(404).json({ success: false, message: "المتجر غير موجود" });
  if (store.status === "suspended") return res.status(403).json({ success: false, message: "المتجر معلق" });
  // In a real system, generate a short-lived impersonation JWT here
  res.json({ success: true, data: { store, impersonationToken: `imp_${Date.now()}` } });
});

// ─── All users across stores ───────────────────────────────────────────────────
router.get("/users", platformOnly, async (req, res) => {
  const { storeId } = req.query;
  const filter = storeId ? { storeId } : {};
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

export default router;
