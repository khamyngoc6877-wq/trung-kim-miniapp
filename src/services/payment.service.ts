import { Payment } from "zmp-sdk/apis";
import type { PaymentItem, PaymentMethod } from "@/types/payment";

const API_URL = String(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function ensureApiUrl(): void {
  if (!API_URL) {
    throw new Error("Thiếu VITE_API_URL trong file .env của Mini App");
  }
}

type SignedPaymentData = {
  amount: number;
  desc: string;
  item: PaymentItem[];
  extradata: string;
  method: string;
  mac: string;
};

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => null);
}

async function getSignedPaymentData(orderId: string): Promise<SignedPaymentData> {
  ensureApiUrl();
  const response = await fetch(`${API_URL}/api/payments/create-signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const result = await readJson(response);
  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tạo dữ liệu thanh toán");
  }
  return result as SignedPaymentData;
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
  const result = await readJson(response);
  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể liên kết mã Checkout");
  }
}

export async function createCheckoutPayment(
  merchantOrderId: string,
  _paymentMethod: PaymentMethod,
) {
  const signedData = await getSignedPaymentData(merchantOrderId);

  const result = await Payment.createOrder({
    amount: signedData.amount,
    desc: signedData.desc,
    item: signedData.item,
    extradata: signedData.extradata,
    method: signedData.method,
    mac: signedData.mac,
  });

  if (!result?.orderId) {
    throw new Error("Checkout SDK không trả về orderId");
  }

  await bindCheckoutOrder(merchantOrderId, String(result.orderId));
  return result;
}
