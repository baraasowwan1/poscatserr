import { Router, Response } from "express";
import { Supplier } from "../models/Supplier";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, status } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }];
    const suppliers = await Supplier.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: suppliers, total: suppliers.length });
  } catch { res.status(500).json({ success: false, message: "خطأ في جلب الموردين" }); }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) { res.status(404).json({ success: false, message: "المورد غير موجود" }); return; }
    res.json({ success: true, data: supplier });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.post("/", hasPermission("suppliers"), async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier, message: "تمت إضافة المورد" });
  } catch { res.status(500).json({ success: false, message: "خطأ في إضافة المورد" }); }
});

router.put("/:id", hasPermission("suppliers"), async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) { res.status(404).json({ success: false, message: "المورد غير موجود" }); return; }
    res.json({ success: true, data: supplier, message: "تم تعديل المورد" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.delete("/:id", hasPermission("suppliers"), async (req: AuthRequest, res: Response) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "تم حذف المورد" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

export default router;
