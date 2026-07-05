import { Router, Response } from "express";
import { Sale } from "../models/Sale";
import { Expense } from "../models/Expense";
import { Product } from "../models/Product";
import { protect, hasPermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect, hasPermission("reports"));

// GET /api/reports/sales?from=&to=
router.get("/sales", async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, groupBy = "day" } = req.query;
    const match: any = { status: "completed" };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from as string);
      if (to) { const end = new Date(to as string); end.setHours(23, 59, 59); match.createdAt.$lte = end; }
    }

    const fmtMap: any = { day: "%Y-%m-%d", week: "%Y-W%V", month: "%Y-%m", year: "%Y" };
    const fmt = fmtMap[groupBy as string] || "%Y-%m-%d";

    const [grouped, totals, byPayment, byCategory] = await Promise.all([
      Sale.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: fmt, date: "$createdAt" } }, revenue: { $sum: "$grandTotal" }, vat: { $sum: "$vatAmount" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: null, revenue: { $sum: "$grandTotal" }, vat: { $sum: "$vatAmount" }, count: { $sum: 1 }, avgOrder: { $avg: "$grandTotal" } } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: "$paymentMethod", revenue: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", nameAr: { $first: "$items.nameAr" }, qty: { $sum: "$items.qty" }, revenue: { $sum: "$items.total" } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ success: true, data: { grouped, totals: totals[0] || {}, byPayment, topProducts: byCategory } });
  } catch { res.status(500).json({ success: false, message: "خطأ في تقرير المبيعات" }); }
});

// GET /api/reports/profit?from=&to=
router.get("/profit", async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const salesMatch: any = { status: "completed" };
    const expMatch: any = { isApproved: true };
    if (from || to) {
      const range: any = {};
      if (from) range.$gte = new Date(from as string);
      if (to) { const end = new Date(to as string); end.setHours(23, 59, 59); range.$lte = end; }
      salesMatch.createdAt = range;
      expMatch.createdAt = range;
    }

    const [salesAgg, expAgg] = await Promise.all([
      Sale.aggregate([{ $match: salesMatch }, { $group: { _id: null, revenue: { $sum: "$grandTotal" }, vat: { $sum: "$vatAmount" } } }]),
      Expense.aggregate([{ $match: expMatch }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const revenue = salesAgg[0]?.revenue || 0;
    const vat = salesAgg[0]?.vat || 0;
    const expenses = expAgg[0]?.total || 0;
    const netRevenue = revenue - vat;
    const netProfit = netRevenue - expenses;

    res.json({ success: true, data: { revenue, vat, netRevenue, expenses, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 } });
  } catch { res.status(500).json({ success: false, message: "خطأ في تقرير الأرباح" }); }
});

// GET /api/reports/inventory
router.get("/inventory", async (_req: AuthRequest, res: Response) => {
  try {
    const [byCategory, lowStock, outOfStock] = await Promise.all([
      Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 }, totalStock: { $sum: "$stock" }, totalValue: { $sum: { $multiply: ["$sellPrice", "$stock"] } } } },
        { $sort: { totalValue: -1 } },
      ]),
      Product.find({ $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$minStock"] }] } }).select("nameAr stock minStock category"),
      Product.find({ stock: 0 }).select("nameAr category"),
    ]);
    res.json({ success: true, data: { byCategory, lowStock, outOfStock } });
  } catch { res.status(500).json({ success: false, message: "خطأ في تقرير المخزون" }); }
});

export default router;
