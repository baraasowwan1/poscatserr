import { Router, Response } from "express";
import { Product } from "../models/Product";
import { InventoryLog } from "../models/InventoryLog";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

// GET /api/products — list with search, filter, pagination
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, status, page = 1, limit = 50, lowStock } = req.query;
    const query: any = {};
    if (search) query.$text = { $search: search as string };
    if (category) query.category = category;
    if (status) query.status = status;
    if (lowStock === "true") query.$expr = { $lte: ["$stock", "$minStock"] };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query).populate("supplier", "name").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);
    res.json({ success: true, data: products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في جلب المنتجات" });
  }
});

// GET /api/products/barcode/:barcode
router.get("/barcode/:barcode", async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) { res.status(404).json({ success: false, message: "المنتج غير موجود" }); return; }
    res.json({ success: true, data: product });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).populate("supplier", "name phone");
    if (!product) { res.status(404).json({ success: false, message: "المنتج غير موجود" }); return; }
    res.json({ success: true, data: product });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// POST /api/products
router.post("/", hasPermission("products"), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product, message: "تمت إضافة المنتج بنجاح" });
  } catch (err: any) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      res.status(400).json({ success: false, message: `${field === "sku" ? "كود المنتج" : "الباركود"} مستخدم مسبقاً` });
      return;
    }
    res.status(500).json({ success: false, message: "خطأ في إضافة المنتج" });
  }
});

// PUT /api/products/:id
router.put("/:id", hasPermission("products"), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) { res.status(404).json({ success: false, message: "المنتج غير موجود" }); return; }
    res.json({ success: true, data: product, message: "تم تعديل المنتج" });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في تعديل المنتج" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", hasPermission("products"), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) { res.status(404).json({ success: false, message: "المنتج غير موجود" }); return; }
    res.json({ success: true, message: "تم حذف المنتج" });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في حذف المنتج" });
  }
});

// PATCH /api/products/:id/stock — manual adjustment
router.patch("/:id/stock", hasPermission("inventory"), async (req: AuthRequest, res: Response) => {
  try {
    const { type, qty, reason } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) { res.status(404).json({ success: false, message: "المنتج غير موجود" }); return; }

    const stockBefore = product.stock;
    product.stock = type === "add" ? product.stock + qty : Math.max(0, product.stock - qty);
    await product.save();

    await InventoryLog.create({
      product: product._id,
      productName: product.nameAr,
      type: "adjustment",
      qty: type === "add" ? qty : -qty,
      stockBefore,
      stockAfter: product.stock,
      reason,
      performedBy: req.user._id,
    });

    res.json({ success: true, data: product, message: "تم تعديل المخزون" });
  } catch {
    res.status(500).json({ success: false, message: "خطأ في تعديل المخزون" });
  }
});

export default router;
