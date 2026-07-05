import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;

    if (!token) {
      res.status(401).json({ success: false, message: "غير مصرح — يرجى تسجيل الدخول" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({ success: false, message: "المستخدم غير موجود" });
      return;
    }
    if (user.status !== "نشط") {
      res.status(401).json({ success: false, message: "الحساب معطّل" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "توكن غير صالح" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user?.role)) {
      res.status(403).json({ success: false, message: "ليس لديك صلاحية للوصول لهذا المورد" });
      return;
    }
    next();
  };
};

export const hasPermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userPerms: string[] = req.user?.permissions ?? [];
    const isAdmin = req.user?.role === "superadmin" || req.user?.role === "admin";
    if (!isAdmin && !userPerms.includes(permission)) {
      res.status(403).json({ success: false, message: `تحتاج صلاحية: ${permission}` });
      return;
    }
    next();
  };
};
