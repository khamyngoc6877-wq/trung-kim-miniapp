import { createCheckoutPayment } from "@/services/payment.service";
import type { PaymentItem, PaymentMethod } from "@/types/payment";

const API_URL = String(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export type CheckoutParams = {
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingMethod: "delivery" | "pickup";
  shippingArea?: "hcm" | "other";
  shippingAddress?: unknown;
  paymentMethod: PaymentMethod;
  items: PaymentItem[];
};

type StoreOrderResult = {
  orderId: string;
  orderCode: string;
};

async function createStoreOrder(params: CheckoutParams): Promise<StoreOrderResult> {
  if (!API_URL) throw new Error("Thiếu VITE_API_URL trong file .env");

  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tạo đơn hàng");
  }
  return result as StoreOrderResult;
}

export function useCheckout() {
  return async function checkout(params: CheckoutParams) {
    const order = await createStoreOrder(params);
    const checkout = await createCheckoutPayment(order.orderId, params.paymentMethod);

    return {
      order,
      checkoutOrderId: String(checkout.orderId),
    };
  };
}
