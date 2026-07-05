import { Router, Response } from "express";
import { Customer } from "../models/Customer";
import { Sale } from "../models/Sale";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = 1, limit = 30 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Customer.countDocuments(query),
    ]);
    res.json({ success: true, data: customers, total });
  } catch { res.status(500).json({ success: false, message: "خطأ في جلب العملاء" }); }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const [customer, sales] = await Promise.all([
      Customer.findById(req.params.id),
      Sale.find({ customer: req.params.id }).sort({ createdAt: -1 }).limit(20),
    ]);
    if (!customer) { res.status(404).json({ success: false, message: "العميل غير موجود" }); return; }
    res.json({ success: true, data: { ...customer.toObject(), recentSales: sales } });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.post("/", hasPermission("customers"), async (req: AuthRequest, res: Response) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer, message: "تمت إضافة العميل" });
  } catch (err: any) {
    if (err.code === 11000) { res.status(400).json({ success: false, message: "رقم الهاتف مسجّل مسبقاً" }); return; }
    res.status(500).json({ success: false, message: "خطأ في إضافة العميل" });
  }
});

router.put("/:id", hasPermission("customers"), async (req: AuthRequest, res: Response) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) { res.status(404).json({ success: false, message: "العميل غير موجود" }); return; }
    res.json({ success: true, data: customer, message: "تم تعديل العميل" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.delete("/:id", hasPermission("customers"), async (req: AuthRequest, res: Response) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "تم حذف العميل" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

export default router;
