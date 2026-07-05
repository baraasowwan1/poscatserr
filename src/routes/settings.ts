import { Router, Response } from "express";
import { Settings } from "../models/Settings";
import { protect, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(protect);

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, data: settings });
  } catch { res.status(500).json({ success: false, message: "خطأ في جلب الإعدادات" }); }
});

router.put("/", authorize("superadmin", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create(req.body);
    else { Object.assign(settings, req.body); await settings.save(); }
    res.json({ success: true, data: settings, message: "تم حفظ الإعدادات" });
  } catch { res.status(500).json({ success: false, message: "خطأ في حفظ الإعدادات" }); }
});

export default router;
