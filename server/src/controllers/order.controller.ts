import crypto from "node:crypto";
import type { Request, Response } from "express";
import { saveOrder, type OrderItem, type PaymentMethod } from "../services/order.service.js";

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as {
      subtotal?: number;
      shippingFee?: number;
      totalAmount?: number;
      shippingMethod?: "delivery" | "pickup";
      shippingArea?: "hcm" | "other";
      shippingAddress?: unknown;
      paymentMethod?: PaymentMethod;
      items?: OrderItem[];
    };

    if (!Number.isFinite(body.subtotal) || Number(body.subtotal) < 0) {
      res.status(400).json({ message: "Tiền sản phẩm không hợp lệ" });
      return;
    }
    if (!Number.isFinite(body.shippingFee) || Number(body.shippingFee) < 0) {
      res.status(400).json({ message: "Phí vận chuyển không hợp lệ" });
      return;
    }
    if (!Number.isFinite(body.totalAmount) || Number(body.totalAmount) <= 0) {
      res.status(400).json({ message: "Tổng tiền không hợp lệ" });
      return;
    }
    if (body.paymentMethod !== "cash" && body.paymentMethod !== "zalopay") {
      res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
      return;
    }
    if (body.shippingMethod !== "delivery" && body.shippingMethod !== "pickup") {
      res.status(400).json({ message: "Hình thức nhận hàng không hợp lệ" });
      return;
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ message: "Đơn hàng chưa có sản phẩm" });
      return;
    }

    const subtotal = Number(body.subtotal);
    const shippingFee = Number(body.shippingFee);
    const totalAmount = Number(body.totalAmount);
    if (subtotal + shippingFee !== totalAmount) {
      res.status(400).json({ message: "Tổng thanh toán không khớp" });
      return;
    }

    const id = crypto.randomUUID();
    const code = `TK-${Date.now()}`;
    const now = new Date().toISOString();

    await saveOrder({
      id,
      code,
      subtotal,
      shippingFee,
      totalAmount,
      shippingMethod: body.shippingMethod,
      shippingArea: body.shippingArea,
      shippingAddress: body.shippingAddress,
      items: body.items.map((item) => ({
        id: String(item.id),
        name: item.name,
        quantity: item.quantity,
        amount: Number(item.amount),
      })),
      paymentMethod: body.paymentMethod,
      paymentStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({ orderId: id, orderCode: code });
  } catch (error) {
    console.error("Create order error", error);
    res.status(500).json({ message: "Không thể tạo đơn hàng" });
  }
}
