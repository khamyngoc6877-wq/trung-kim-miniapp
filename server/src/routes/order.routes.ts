import { Router } from "express";
import {
  adminListOrders,
  adminUpdateOrderStatus,
  createOrder,
  getOrder,
} from "../controllers/order.controller.js";
import { requireAdmin } from "../middleware/admin-auth.js";

const router = Router();

router.get("/admin/all", requireAdmin, adminListOrders);
router.patch(
  "/admin/:orderId/status",
  requireAdmin,
  adminUpdateOrderStatus,
);

router.post("/", createOrder);
router.get("/:orderId", getOrder);

export default router;
