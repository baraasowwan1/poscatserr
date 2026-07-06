import { Router, Response } from "express";
import { User } from "../models/User";
import { protect, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect, authorize("superadmin", "admin", "مالك المنصة", "مدير النظام"));

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, data: users, total: users.length });
  } catch { res.status(500).json({ success: false, message: "خطأ في جلب المستخدمين" }); }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.create(req.body);
    const { password: _, ...userObj } = user.toObject();
    res.status(201).json({ success: true, data: userObj, message: "تمت إضافة المستخدم" });
  } catch (err: any) {
    if (err.code === 11000) { res.status(400).json({ success: false, message: "البريد الإلكتروني مستخدم مسبقاً" }); return; }
    res.status(500).json({ success: false, message: "خطأ في إضافة المستخدم" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { password, ...rest } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true }).select("-password");
    if (!user) { res.status(404).json({ success: false, message: "المستخدم غير موجود" }); return; }
    res.json({ success: true, data: user, message: "تم تعديل المستخدم" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.patch("/:id/toggle", async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: "المستخدم غير موجود" }); return; }
    user.status = user.status === "نشط" ? "غير نشط" : "نشط";
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, data: { status: user.status }, message: `تم ${user.status === "نشط" ? "تفعيل" : "تعطيل"} الحساب` });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === String(req.user._id)) { res.status(400).json({ success: false, message: "لا يمكنك حذف حسابك الخاص" }); return; }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "تم حذف المستخدم" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

export default router;
