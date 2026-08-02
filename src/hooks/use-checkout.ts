import { createCheckoutPayment } from "@/services/payment.service";
import type { PaymentMethod } from "@/types/payment";

const API_URL = String(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type CheckoutItem = {
  id: string;
  name: string;
  quantity: number;
  amount: number;
};

type CheckoutInput = {
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingMethod: "delivery" | "pickup";
  shippingArea?: "hcm" | "other";
  shippingAddress?: unknown;
  paymentMethod: PaymentMethod;
  items: CheckoutItem[];
};

type MerchantOrder = {
  orderId: string;
  orderCode: string;
};

async function createMerchantOrder(input: CheckoutInput): Promise<MerchantOrder> {
  if (!API_URL) throw new Error("Thiếu VITE_API_URL");

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (error) {
    console.error("Create merchant order network error", error);
    throw new Error(`Không thể kết nối máy chủ ${API_URL}`);
  }

  const result = (await response.json().catch(() => null)) as
    | (MerchantOrder & { message?: string })
    | null;

  if (!response.ok) {
    throw new Error(result?.message ?? `Không thể tạo đơn hàng (${response.status})`);
  }
  if (!result?.orderId) {
    throw new Error("Backend không trả orderId nội bộ");
  }

  return result;
}

export function useCheckout() {
  return async (input: CheckoutInput) => {
    const order = await createMerchantOrder(input);
    const checkout = await createCheckoutPayment(
      order.orderId,
      input.paymentMethod,
    );

    return {
      order,
      checkoutOrderId: checkout.orderId,
    };
  };
}
