import type { Request, Response } from "express";
import { findOrderById, updateOnlinePayment } from "../services/order.service.js";
import { createZaloPayOrder, verifyZaloPayCallback } from "../services/zalopay.service.js";

export async function createZaloPayPayment(req: Request, res: Response): Promise<void> {
  try {
    const orderId = String(req.body?.orderId ?? "").trim();
    if (!orderId) { res.status(400).json({ message: "Thiếu orderId" }); return; }
    const order = await findOrderById(orderId);
    if (!order) { res.status(404).json({ message: "Không tìm thấy đơn hàng" }); return; }
    if (order.paymentStatus === "paid") { res.status(409).json({ message: "Đơn hàng đã thanh toán" }); return; }
    const result = await createZaloPayOrder(order);
    res.status(200).json(result);
  } catch (error) {
    console.error("ZALOPAY_CREATE_ERROR:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Không thể tạo thanh toán ZaloPay" });
  }
}

export async function zaloPayCallback(req: Request, res: Response): Promise<void> {
  try {
    const data = String(req.body?.data ?? "");
    const mac = String(req.body?.mac ?? "");
    if (!verifyZaloPayCallback(data, mac)) {
      res.status(200).json({ return_code: 2, return_message: "Invalid MAC" });
      return;
    }

    const payload = JSON.parse(data) as any;
    let embed: any = {};
    try { embed = JSON.parse(String(payload.embed_data ?? "{}")); } catch { embed = {}; }
    const merchantOrderId = String(embed.merchantOrderId ?? "").trim();
    if (!merchantOrderId) {
      res.status(200).json({ return_code: 2, return_message: "Missing merchantOrderId" });
      return;
    }

    const order = await findOrderById(merchantOrderId);
    if (!order) {
      res.status(200).json({ return_code: 2, return_message: "Order not found" });
      return;
    }
    if (Number(order.totalAmount) !== Number(payload.amount)) {
      res.status(200).json({ return_code: 2, return_message: "Amount mismatch" });
      return;
    }

    await updateOnlinePayment({
      merchantOrderId: order.id,
      checkoutOrderId: String(payload.app_trans_id ?? ""),
      transId: String(payload.zp_trans_id ?? ""),
      providerMethod: "ZALOPAY",
      message: "ZaloPay callback success",
      success: true,
    });

    res.status(200).json({ return_code: 1, return_message: "Success" });
  } catch (error) {
    console.error("ZALOPAY_CALLBACK_ERROR:", error);
    res.status(200).json({ return_code: 0, return_message: error instanceof Error ? error.message : "Internal error" });
  }
}
