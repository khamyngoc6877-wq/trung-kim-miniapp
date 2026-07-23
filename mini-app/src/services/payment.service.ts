import { Payment } from "zmp-sdk/apis";
import type { PaymentItem, PaymentMethod } from "@/types/payment";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Thiếu VITE_API_URL");
}

type SignedPaymentData = {
  amount: number;
  desc: string;
  item: PaymentItem[];
  extradata: string;
  method: string;
  mac: string;
};

async function getSignedPaymentData(
  merchantOrderId: string,
  paymentMethod: PaymentMethod,
): Promise<SignedPaymentData> {
  const response = await fetch(`${API_URL}/api/payments/create-signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: merchantOrderId, paymentMethod }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tạo dữ liệu thanh toán");
  }

  return result;
}

async function bindCheckoutOrder(
  merchantOrderId: string,
  checkoutOrderId: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/payments/bind-checkout-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantOrderId, checkoutOrderId }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể liên kết mã thanh toán");
  }
}

export async function createCheckoutOrder(
  merchantOrderId: string,
  paymentMethod: PaymentMethod,
) {
  const signedData = await getSignedPaymentData(merchantOrderId, paymentMethod);

  const result = await Payment.createOrder({
    amount: signedData.amount,
    desc: signedData.desc,
    item: signedData.item,
    extradata: signedData.extradata,
    method: signedData.method,
    mac: signedData.mac,
  });

  await bindCheckoutOrder(merchantOrderId, result.orderId);
  return result;
}
