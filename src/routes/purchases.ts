import { Router, Response } from "express";
import { Purchase } from "../models/Purchase";
import { Supplier } from "../models/Supplier";
import { Product } from "../models/Product";
import { InventoryLog } from "../models/InventoryLog";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = 1, limit = 30 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { poNumber: { $regex: search, $options: "i" } },
      { supplierName: { $regex: search, $options: "i" } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [purchases, total] = await Promise.all([
      Purchase.find(query).populate("supplier", "name phone").populate("createdBy", "name").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Purchase.countDocuments(query),
    ]);
    res.json({ success: true, data: purchases, total });
  } catch { res.status(500).json({ success: false, message: "خطأ في جلب المشتريات" }); }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("supplier", "name phone email")
      .populate("createdBy", "name")
      .populate("receivedBy", "name");
    if (!purchase) { res.status(404).json({ success: false, message: "طلب الشراء غير موجود" }); return; }
    res.json({ success: true, data: purchase });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

router.post("/", hasPermission("purchases"), async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.body.supplierId);
    if (!supplier) { res.status(404).json({ success: false, message: "المورد غير موجود" }); return; }

    const items = req.body.items.map((i: any) => ({
      product: i.productId,
      nameAr: i.nameAr,
      qty: i.qty,
      unitCost: i.unitCost,
      total: i.qty * i.unitCost,
    }));
    const subtotal = items.reduce((a: number, i: any) => a + i.total, 0);
    const vatAmount = subtotal * (req.body.vatRate || 0.16);

    const purchase = await Purchase.create({
      supplier: supplier._id,
      supplierName: supplier.name,
      createdBy: req.user._id,
      items,
      subtotal,
      vatAmount,
      grandTotal: subtotal + vatAmount,
      notes: req.body.notes,
    });
    res.status(201).json({ success: true, data: purchase, message: "تم إنشاء طلب الشراء" });
  } catch { res.status(500).json({ success: false, message: "خطأ في إنشاء طلب الشراء" }); }
});

// PATCH /api/purchases/:id/approve
router.patch("/:id/approve", hasPermission("purchases"), async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
    res.json({ success: true, data: purchase, message: "تمت الموافقة على طلب الشراء" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

// PATCH /api/purchases/:id/receive — receive and update stock
router.patch("/:id/receive", hasPermission("inventory"), async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) { res.status(404).json({ success: false, message: "طلب الشراء غير موجود" }); return; }
    if (purchase.status === "received") { res.status(400).json({ success: false, message: "تم استلام هذا الطلب مسبقاً" }); return; }

    for (const item of purchase.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const stockBefore = product.stock;
        product.stock += item.qty;
        product.costPrice = item.unitCost;
        await product.save();
        await InventoryLog.create({
          product: product._id, productName: product.nameAr,
          type: "purchase", qty: item.qty, stockBefore, stockAfter: product.stock,
          reference: purchase.poNumber, performedBy: req.user._id,
        });
      }
    }

    purchase.status = "received";
    purchase.receivedAt = new Date();
    purchase.receivedBy = req.user._id;
    await purchase.save();

    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: { totalPurchases: purchase.grandTotal, balance: purchase.grandTotal },
    });

    res.json({ success: true, data: purchase, message: "تم تأكيد الاستلام وتحديث المخزون" });
  } catch { res.status(500).json({ success: false, message: "خطأ في تأكيد الاستلام" }); }
});

// PATCH /api/purchases/:id/cancel
router.patch("/:id/cancel", hasPermission("purchases"), async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    res.json({ success: true, data: purchase, message: "تم إلغاء طلب الشراء" });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

export default router;
