import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db";

// Route imports — ES import so TypeScript resolves correctly
import authRoutes      from "./routes/auth";
import userRoutes      from "./routes/users";
import productRoutes   from "./routes/products";
import customerRoutes  from "./routes/customers";
import supplierRoutes  from "./routes/suppliers";
import saleRoutes      from "./routes/sales";
import purchaseRoutes  from "./routes/purchases";
import expenseRoutes   from "./routes/expenses";
import inventoryRoutes from "./routes/inventory";
import dashboardRoutes from "./routes/dashboard";
import reportRoutes    from "./routes/reports";
import settingsRoutes  from "./routes/settings";
import platformRoutes  from "./routes/platform";

const app = express();

connectDB();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter   = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: "محاولات كثيرة، حاول لاحقاً" } });

app.use("/api/", globalLimiter);
app.use("/api/auth/login", authLimiter);

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.use("/uploads", express.static("uploads"));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/sales",     saleRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/expenses",  expenseRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports",   reportRoutes);
app.use("/api/settings",  settingsRoutes);
app.use("/api/platform",  platformRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "✅ SOWWAN POS API Running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "المسار غير موجود" });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "خطأ في الخادم",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SOWWAN POS Server on port ${PORT} [${process.env.NODE_ENV}]`);
});

export default app;
