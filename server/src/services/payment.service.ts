import type { StoreOrder, PaymentMethod } from "./order.service.js";
import { createOrderMac } from "../utils/payment-mac.js";

export type PaymentEnvironment = "sandbox" | "production";

function resolveMethodId(
  paymentMethod: PaymentMethod,
  environment: PaymentEnvironment,
): string {
  if (paymentMethod === "cash") {
    return environment === "production" ? "COD" : "COD_SANDBOX";
  }
  return environment === "production" ? "ZALOPAY" : "ZALOPAY_SANDBOX";
}

export function preparePaymentData(
  order: StoreOrder,
  environment: PaymentEnvironment,
) {
  const privateKey = process.env.PAYMENT_PRIVATE_KEY;
  if (!privateKey) throw new Error("Thiếu PAYMENT_PRIVATE_KEY");

  const desc =
    order.paymentMethod === "cash"
      ? `Đơn COD ${order.code}`
      : `Thanh toán đơn ${order.code}`;

  const extradata = JSON.stringify({
    merchantOrderId: order.id,
    merchantOrderCode: order.code,
    paymentMethod: order.paymentMethod,
  });

  const method = JSON.stringify({
    id: resolveMethodId(order.paymentMethod, environment),
    isCustom: false,
  });

  const itemString = JSON.stringify(order.items);

  const mac = createOrderMac(
    {
      amount: order.totalAmount,
      desc,
      extradata,
      item: itemString,
      method,
    },
    privateKey,
  );

  return {
    amount: order.totalAmount,
    desc,
    item: order.items,
    extradata,
    method,
    mac,
  };
}
