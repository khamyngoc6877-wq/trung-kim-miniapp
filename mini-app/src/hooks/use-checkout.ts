import { createCheckoutOrder } from "@/services/payment.service";
import type { PaymentItem, PaymentMethod } from "@/types/payment";
import type { ShippingArea, ShippingMethod } from "@/utils/shipping";

const API_URL = import.meta.env.VITE_API_URL;

type CheckoutParams = {
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingMethod: ShippingMethod;
  shippingArea?: ShippingArea;
  shippingAddress?: unknown;
  paymentMethod: PaymentMethod;
  items: PaymentItem[];
};

type StoreOrderResult = {
  orderId: string;
  orderCode: string;
};

async function createStoreOrder(params: CheckoutParams): Promise<StoreOrderResult> {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tạo đơn hàng");
  }

  return result;
}

export function useCheckout() {
  return async function checkout(params: CheckoutParams) {
    const order = await createStoreOrder(params);
    const checkoutResult = await createCheckoutOrder(order.orderId, params.paymentMethod);

    return {
      order,
      checkoutOrderId: checkoutResult.orderId,
    };
  };
}
