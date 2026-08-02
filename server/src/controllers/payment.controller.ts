import type { Request, Response } from "express";
import {
  bindCheckoutOrder, findOrderByCheckoutOrderId, findOrderById,
  findOrderByTransactionId, updateCodNotify, updateOnlinePayment,
} from "../services/order.service.js";
import { preparePaymentData } from "../services/payment.service.js";
import { type CallbackData, verifyCallbackMac, verifyNotifyMac, verifyOverallMac } from "../utils/payment-mac.js";

export async function createSignature(req: Request, res: Response): Promise<void> {
  try {
    const orderId = String(req.body?.orderId ?? "").trim();
    if (!orderId) return void res.status(400).json({ message: "orderId không hợp lệ" });
    const order = await findOrderById(orderId);
    if (!order) return void res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.paymentStatus === "paid") return void res.status(409).json({ message: "Đơn hàng đã thanh toán" });
    const environment = process.env.PAYMENT_ENVIRONMENT === "production" ? "production" : "sandbox";
    res.status(200).json(preparePaymentData(order, environment));
  } catch (error) {
    console.error("Create signature error", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Không thể tạo dữ liệu thanh toán" });
  }
}

export async function bindCheckout(req: Request, res: Response): Promise<void> {
  try {
    const merchantOrderId = String(req.body?.merchantOrderId ?? "").trim();
    const checkoutOrderId = String(req.body?.checkoutOrderId ?? "").trim();
    if (!merchantOrderId || !checkoutOrderId) return void res.status(400).json({ message: "Thiếu mã đơn hàng" });
    await bindCheckoutOrder(merchantOrderId, checkoutOrderId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Bind checkout error", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Không thể liên kết mã Checkout" });
  }
}

export async function paymentNotify(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body?.data as { appId?: string; orderId?: string; method?: string } | undefined;
    const mac = String(req.body?.mac ?? "");
    if (!data?.appId || !data.orderId || !data.method || !mac) return void res.status(400).json({ returnCode: -1, returnMessage: "Invalid notify data" });
    const privateKey = process.env.PAYMENT_PRIVATE_KEY?.trim();
    if (!privateKey) throw new Error("Thiếu PAYMENT_PRIVATE_KEY");
    if (!verifyNotifyMac({ appId: data.appId, orderId: data.orderId, method: data.method, receivedMac: mac, privateKey })) {
      return void res.status(401).json({ returnCode: -1, returnMessage: "Invalid MAC" });
    }
    const order = await updateCodNotify({ checkoutOrderId: data.orderId, providerMethod: data.method });
    if (!order) return void res.status(404).json({ returnCode: -1, returnMessage: "Order not found" });
    res.status(200).json({ returnCode: 1, returnMessage: "Success" });
  } catch (error) {
    console.error("COD notify error", error);
    res.status(500).json({ returnCode: -1, returnMessage: "Internal server error" });
  }
}

function decodeExtraData(value?: string): Record<string, unknown> {
  if (!value) return {};
  for (const candidate of [value, (() => { try { return decodeURIComponent(value); } catch { return value; } })()]) {
    try { return JSON.parse(candidate) as Record<string, unknown>; } catch { /* continue */ }
  }
  return {};
}

export async function paymentCallback(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body?.data as CallbackData | undefined;
    const mac = String(req.body?.mac ?? "");
    const overallMac = String(req.body?.overallMac ?? "");
    if (!data || !mac || !overallMac) return void res.status(400).json({ returnCode: -1, returnMessage: "Invalid callback data" });
    const privateKey = process.env.PAYMENT_PRIVATE_KEY?.trim();
    if (!privateKey) throw new Error("Thiếu PAYMENT_PRIVATE_KEY");
    if (!verifyCallbackMac(data, mac, privateKey) || !verifyOverallMac(data, overallMac, privateKey)) {
      return void res.status(401).json({ returnCode: -1, returnMessage: "Invalid callback MAC" });
    }
    const duplicate = await findOrderByTransactionId(String(data.transId));
    if (duplicate?.paymentStatus === "paid") return void res.status(200).json({ returnCode: 2, returnMessage: "Transaction processed" });

    const extra = decodeExtraData(data.extradata);
    const merchantOrderId = String(extra.merchantOrderId ?? "");
    const order = merchantOrderId ? await findOrderById(merchantOrderId) : await findOrderByCheckoutOrderId(String(data.orderId));
    if (!order) return void res.status(404).json({ returnCode: -1, returnMessage: "Order not found" });
    if (Number(order.totalAmount) !== Number(data.amount)) return void res.status(400).json({ returnCode: -1, returnMessage: "Amount mismatch" });

    await updateOnlinePayment({
      merchantOrderId: order.id,
      checkoutOrderId: String(data.orderId),
      transId: String(data.transId),
      providerMethod: data.method,
      message: data.message,
      success: Number(data.resultCode) === 1,
    });
    res.status(200).json({ returnCode: 1, returnMessage: "Success" });
  } catch (error) {
    console.error("Payment callback error", error);
    res.status(500).json({ returnCode: -1, returnMessage: "Internal server error" });
  }
}
