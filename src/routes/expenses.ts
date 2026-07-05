import { Router, Response } from "express";
import { Expense } from "../models/Expense";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, isApproved, from, to } = req.query;
    const query: any = {};
    if (category) query.category = category;
    if (isApproved !== undefined) query.isApproved = isApproved === "true";
    if (search) query.description = { $regex: search, $options: "i" };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from as string);
      if (to) { const end = new Date(to as string); end.setHours(23, 59, 59); query.createdAt.$lte = end; }
    }
    const expenses = await Expense.find(query).populate("paidBy", "name").populate("approvedBy", "name").sort({ createdAt: -1 });
    const totalAmount = expenses.reduce((a, e) => a + e.amount, 0);
    res.json({ success: true, data: expenses, total: expenses.length, totalAmount });
  } catch { res.status(500).json({ success: false, message: "خطأ في جلب المصاريف" }); }
});

router.post("/", hasPermission("expenses"), async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.create({ ...req.body, paidBy: req.user._id });
    res.status(201).json({ success: true, data: expense, message: "تمت إضافة المصروف" });
  } catch { res.status(500).json({ success: false, message: "خطأ في إضافة المصروف" }); }
});

router.patch("/:id/approve", hasPermission("expenses"), async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id,
      { isApproved: true, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: expense, message: "تمت الموافقة على المصروف" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.delete("/:id", hasPermission("expenses"), async (req: AuthRequest, res: Response) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "تم حذف المصروف" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

export default router;
