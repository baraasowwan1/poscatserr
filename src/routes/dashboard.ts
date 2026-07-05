import { Router, Response } from "express";
import { Sale } from "../models/Sale";
import { Product } from "../models/Product";
import { Customer } from "../models/Customer";
import { Expense } from "../models/Expense";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todaySales, monthSales, totalProducts, lowStockProducts,
      outOfStockProducts, totalCustomers, totalExpensesMonth,
      recentSales, topProducts,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 }, vat: { $sum: "$vatAmount" } } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ status: { $ne: "inactive" } }),
      Product.countDocuments({ $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$minStock"] }] } }),
      Product.countDocuments({ stock: 0 }),
      Customer.countDocuments(),
      Expense.aggregate([{ $match: { createdAt: { $gte: monthStart }, isApproved: true } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Sale.find({ status: "completed" }).populate("cashier", "name").populate("customer", "name").sort({ createdAt: -1 }).limit(10),
      Sale.aggregate([
        { $match: { status: "completed", createdAt: { $gte: monthStart } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", nameAr: { $first: "$items.nameAr" }, totalQty: { $sum: "$items.qty" }, totalRevenue: { $sum: "$items.total" } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Last 7 days chart data
    const last7 = await Sale.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: "completed" } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, sales: { $sum: "$grandTotal" }, profit: { $sum: { $subtract: ["$grandTotal", "$vatAmount"] } } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        today: { sales: todaySales[0]?.total || 0, count: todaySales[0]?.count || 0, vat: todaySales[0]?.vat || 0 },
        month: { sales: monthSales[0]?.total || 0, count: monthSales[0]?.count || 0 },
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalCustomers,
        monthExpenses: totalExpensesMonth[0]?.total || 0,
        recentSales,
        topProducts,
        chartData: last7,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "خطأ في جلب بيانات لوحة التحكم" });
  }
});

export default router;
