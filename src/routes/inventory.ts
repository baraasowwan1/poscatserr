import { Router, Response } from "express";
import { InventoryLog } from "../models/InventoryLog";
import { Product } from "../models/Product";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

// GET /api/inventory/logs
router.get("/logs", async (req: AuthRequest, res: Response) => {
  try {
    const { product, type, page = 1, limit = 50 } = req.query;
    const query: any = {};
    if (product) query.product = product;
    if (type) query.type = type;
    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      InventoryLog.find(query).populate("performedBy", "name").populate("product", "nameAr barcode").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      InventoryLog.countDocuments(query),
    ]);
    res.json({ success: true, data: logs, total });
  } catch { res.status(500).json({ success: false, message: "خطأ في جلب حركات المخزون" }); }
});

// GET /api/inventory/low-stock
router.get("/low-stock", async (_req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find({ $expr: { $lte: ["$stock", "$minStock"] } }).sort({ stock: 1 });
    res.json({ success: true, data: products, total: products.length });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

// GET /api/inventory/valuation
router.get("/valuation", hasPermission("inventory"), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await Product.aggregate([
      { $group: {
        _id: "$category",
        totalCostValue: { $sum: { $multiply: ["$costPrice", "$stock"] } },
        totalSellValue: { $sum: { $multiply: ["$sellPrice", "$stock"] } },
        totalItems: { $sum: "$stock" },
        productCount: { $sum: 1 },
      }},
      { $sort: { totalSellValue: -1 } },
    ]);
    const totals = result.reduce((acc, r) => ({
      totalCostValue: acc.totalCostValue + r.totalCostValue,
      totalSellValue: acc.totalSellValue + r.totalSellValue,
      totalItems: acc.totalItems + r.totalItems,
    }), { totalCostValue: 0, totalSellValue: 0, totalItems: 0 });
    res.json({ success: true, data: result, totals });
  } catch { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

export default router;
