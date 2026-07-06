import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any });

// POST /api/auth/login — supports username OR email login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, username, password, storeSlug: requestedSlug } = req.body;
    const credential = username || email;
    if (!credential || !password) {
      res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبان" });
      return;
    }

    // Build query — search by username/email, optionally scoped to store
    const baseQuery = { $or: [{ username: credential.toLowerCase() }, { email: credential.toLowerCase() }] };
    let user = null;

    if (requestedSlug && requestedSlug !== "__platform__") {
      // Try exact storeSlug match first
      user = await User.findOne({ ...baseQuery, storeSlug: requestedSlug } as any).select("+password");
      // If not found, try without storeSlug restriction (handles mismatched slugs)
      if (!user) {
        user = await User.findOne(baseQuery).select("+password");
        // Verify it's not a platform admin trying to access a store
        if (user && user.role === "مالك المنصة") {
          res.status(403).json({ success: false, message: "مالك المنصة لا يدخل عبر رابط المتجر" });
          return;
        }
      }
    } else {
      user = await User.findOne(baseQuery).select("+password");
    }

    if (!user || !(await user.matchPassword(password))) {
      res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
      return;
    }
    if (user.status !== "نشط") {
      res.status(401).json({ success: false, message: "الحساب معطّل، تواصل مع المدير" });
      return;
    }
    if (user.role === "مالك المنصة" && requestedSlug && requestedSlug !== "__platform__") {
      res.status(403).json({ success: false, message: "مالك المنصة لا يدخل عبر رابط المتجر" });
      return;
    }

    // Check store status
    if (user.role !== "مالك المنصة" && user.storeSlug) {
      const { TenantStore } = await import("../models/TenantStore") as any;
      const store = await TenantStore.findOne({
        $or: [{ slug: user.storeSlug }, { storeId: user.storeSlug }]
      });
      if (store?.status === "suspended") {
        res.status(403).json({ success: false, message: `متجر "${store.name}" موقوف. تواصل مع إدارة المنصة.` });
        return;
      }
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = signToken(String(user._id));
    res.json({
      success: true,
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        username: user.username, role: user.role,
        permissions: user.permissions, storeSlug: user.storeSlug,
        status: user.status, avatar: user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// GET /api/auth/store-check/:slug — verify store exists and is active (public)
router.get("/store-check/:slug", async (req: Request, res: Response) => {
  try {
    const { TenantStore } = await import("../models/TenantStore") as any;
    const s = req.params.slug;
    // Search by slug OR storeId (handles stores created before slug field was added)
    const store = await TenantStore.findOne({
      $or: [
        { slug: s },
        { storeId: s },
        { storeId: `store_${s}` },
        // Also try matching by store name converted to simple slug
        { name: new RegExp(`^${s.replace(/-/g, '\\s*')}$`, 'i') }
      ]
    });
    if (!store) return res.status(404).json({ success: false, message: "المتجر غير موجود" });
    if (store.status === "suspended") return res.status(403).json({ success: false, message: "هذا المتجر معلق" });
    const trialExpired = store.status === "trial" && store.trialEndsAt && new Date(store.trialEndsAt) < new Date();
    if (trialExpired) return res.status(403).json({ success: false, message: "انتهت فترة التجربة" });
    res.json({ success: true, data: { name: store.name, sector: store.sector, status: store.status } });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

// GET /api/auth/me
router.get("/me", protect, async (req: AuthRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/logout
router.post("/logout", protect, (_req: Request, res: Response) => {
  res.json({ success: true, message: "تم تسجيل الخروج" });
});

// PUT /api/auth/change-password
router.put("/change-password", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await user.matchPassword(currentPassword))) {
      res.status(400).json({ success: false, message: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

export default router;
