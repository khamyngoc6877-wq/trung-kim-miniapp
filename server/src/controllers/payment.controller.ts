import type { Request, Response } from "express";
import {
  bindCheckoutOrder,
  findOrderByCheckoutOrderId,
  findOrderById,
  findOrderByTransactionId,
  updateCodNotify,
  updateOnlinePayment,
} from "../services/order.service.js";
import { preparePaymentData } from "../services/payment.service.js";
import {
  type CallbackData,
  verifyCallbackMac,
  verifyNotifyMac,
  verifyOverallMac,
} from "../utils/payment-mac.js";

export async function createSignature(req: Request, res: Response): Promise<void> {
  try {
    const orderId = String(req.body?.orderId ?? "").trim();
    if (!orderId) {
      res.status(400).json({ message: "orderId không hợp lệ" });
      return;
    }

    const order = await findOrderById(orderId);
    if (!order) {
      res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      return;
    }
    if (order.paymentStatus === "paid") {
      res.status(409).json({ message: "Đơn hàng đã thanh toán" });
      return;
    }

    const environment =
      process.env.PAYMENT_ENVIRONMENT === "production" ? "production" : "sandbox";

    res.status(200).json(preparePaymentData(order, environment));
  } catch (error) {
    console.error("Create signature error", error);
    res.status(500).json({ message: "Không thể tạo dữ liệu thanh toán" });
  }
}

export async function bindCheckout(req: Request, res: Response): Promise<void> {
  try {
    const merchantOrderId = String(req.body?.merchantOrderId ?? "").trim();
    const checkoutOrderId = String(req.body?.checkoutOrderId ?? "").trim();
    if (!merchantOrderId || !checkoutOrderId) {
      res.status(400).json({ message: "Thiếu mã đơn hàng" });
      return;
    }

    await bindCheckoutOrder(merchantOrderId, checkoutOrderId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Bind checkout error", error);
    res.status(500).json({ message: "Không thể liên kết mã Checkout" });
  }
}

export async function paymentNotify(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body?.data as
      | { appId?: string; orderId?: string; method?: string }
      | undefined;
    const mac = String(req.body?.mac ?? "");

    if (!data?.appId || !data.orderId || !data.method || !mac) {
      res.status(400).json({ returnCode: -1, returnMessage: "Invalid notify data" });
      return;
    }

    const privateKey = process.env.PAYMENT_PRIVATE_KEY;
    if (!privateKey) throw new Error("Thiếu PAYMENT_PRIVATE_KEY");

    const valid = verifyNotifyMac({
      appId: String(data.appId),
      orderId: String(data.orderId),
      method: String(data.method),
      receivedMac: mac,
      privateKey,
    });

    if (!valid) {
      res.status(401).json({ returnCode: -1, returnMessage: "Invalid MAC" });
      return;
    }

    const order = await updateCodNotify({
      checkoutOrderId: String(data.orderId),
      providerMethod: String(data.method),
    });

    if (!order) {
      res.status(404).json({ returnCode: -1, returnMessage: "Order not found" });
      return;
    }

    res.status(200).json({ returnCode: 1, returnMessage: "Success" });
  } catch (error) {
    console.error("COD notify error", error);
    res.status(500).json({ returnCode: -1, returnMessage: "Internal server error" });
  }
}

function decodeExtraData(value?: string): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(decodeURIComponent(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function paymentCallback(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body?.data as CallbackData | undefined;
    const mac = String(req.body?.mac ?? "");
    const overallMac = String(req.body?.overallMac ?? "");

    if (!data || !mac || !overallMac) {
      res.status(400).json({ returnCode: -1, returnMessage: "Invalid callback data" });
      return;
    }

    const privateKey = process.env.PAYMENT_PRIVATE_KEY;
    if (!privateKey) throw new Error("Thiếu PAYMENT_PRIVATE_KEY");

    if (
      !verifyCallbackMac(data, mac, privateKey) ||
      !verifyOverallMac(data, overallMac, privateKey)
    ) {
      res.status(401).json({ returnCode: -1, returnMessage: "Invalid callback MAC" });
      return;
    }

    const duplicate = await findOrderByTransactionId(String(data.transId));
    if (duplicate?.paymentStatus === "paid") {
      res.status(200).json({ returnCode: 2, returnMessage: "Transaction processed" });
      return;
    }

    const extra = decodeExtraData(data.extradata);
    const merchantOrderId = String(extra.merchantOrderId ?? "");
    const order = merchantOrderId
      ? await findOrderById(merchantOrderId)
      : await findOrderByCheckoutOrderId(String(data.orderId));

    if (!order) {
      res.status(404).json({ returnCode: -1, returnMessage: "Order not found" });
      return;
    }

    if (Number(order.totalAmount) !== Number(data.amount)) {
      res.status(400).json({ returnCode: -1, returnMessage: "Amount mismatch" });
      return;
    }

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
