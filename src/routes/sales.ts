import { Router, Response } from "express";
import { Sale } from "../models/Sale";
import { Product } from "../models/Product";
import { Customer } from "../models/Customer";
import { InventoryLog } from "../models/InventoryLog";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

// GET /api/sales
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, from, to, method, page = 1, limit = 30 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (method) query.paymentMethod = method;
    if (search) query.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
    ];
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from as string);
      if (to) { const end = new Date(to as string); end.setHours(23, 59, 59); query.createdAt.$lte = end; }
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [sales, total] = await Promise.all([
      Sale.find(query).populate("cashier", "name").populate("customer", "name phone").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Sale.countDocuments(query),
    ]);
    res.json({ success: true, data: sales, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في جلب المبيعات" });
  }
});

// GET /api/sales/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("cashier", "name")
      .populate("customer", "name phone")
      .populate("items.product", "nameAr barcode");
    if (!sale) { res.status(404).json({ success: false, message: "الفاتورة غير موجودة" }); return; }
    res.json({ success: true, data: sale });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// POST /api/sales — create new sale
router.post("/", hasPermission("pos"), async (req: AuthRequest, res: Response) => {
  try {
    const { items, customerId, customerName, paymentMethod, cashGiven, notes } = req.body;

    let subtotal = 0;
    let vatAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) { res.status(400).json({ success: false, message: `المنتج ${item.productId} غير موجود` }); return; }
      if (product.stock < item.qty) { res.status(400).json({ success: false, message: `المخزون غير كافٍ للمنتج: ${product.nameAr}` }); return; }

      const lineSubtotal = product.sellPrice * item.qty * (1 - (item.discount || 0) / 100);
      const lineVat = product.hasVAT ? lineSubtotal * product.vatRate : 0;
      subtotal += lineSubtotal;
      vatAmount += lineVat;

      processedItems.push({
        product: product._id,
        nameAr: product.nameAr,
        barcode: product.barcode,
        qty: item.qty,
        unitPrice: product.sellPrice,
        discount: item.discount || 0,
        vatRate: product.vatRate,
        total: lineSubtotal + lineVat,
      });

      // Deduct stock
      const stockBefore = product.stock;
      product.stock -= item.qty;
      await product.save();
      await InventoryLog.create({
        product: product._id, productName: product.nameAr,
        type: "sale", qty: -item.qty, stockBefore, stockAfter: product.stock,
        performedBy: req.user._id,
      });
    }

    const grandTotal = subtotal + vatAmount;
    const sale = await Sale.create({
      customer: customerId || undefined,
      customerName: customerName || "عميل نقدي",
      cashier: req.user._id,
      items: processedItems,
      subtotal,
      vatAmount,
      grandTotal,
      paymentMethod,
      cashGiven,
      changeGiven: cashGiven ? cashGiven - grandTotal : 0,
      notes,
    });

    // Update customer loyalty & purchase total
    if (customerId) {
      const points = Math.floor(grandTotal);
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalPurchases: grandTotal, totalVisits: 1, loyaltyPoints: points },
      });
    }

    res.status(201).json({ success: true, data: sale, message: "تمت عملية البيع بنجاح" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "خطأ في إتمام البيع" });
  }
});

// PATCH /api/sales/:id/refund
router.patch("/:id/refund", hasPermission("sales"), async (req: AuthRequest, res: Response) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) { res.status(404).json({ success: false, message: "الفاتورة غير موجودة" }); return; }
    if (sale.status === "refunded") { res.status(400).json({ success: false, message: "تم استرجاع هذه الفاتورة مسبقاً" }); return; }

    // Restore stock
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const stockBefore = product.stock;
        product.stock += item.qty;
        await product.save();
        await InventoryLog.create({
          product: product._id, productName: product.nameAr,
          type: "return", qty: item.qty, stockBefore, stockAfter: product.stock,
          reference: sale.invoiceNumber, performedBy: req.user._id,
        });
      }
    }
    sale.status = "refunded";
    sale.refundReason = req.body.reason;
    await sale.save();
    res.json({ success: true, data: sale, message: "تم استرجاع الفاتورة" });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في الاسترجاع" });
  }
});

export default router;
