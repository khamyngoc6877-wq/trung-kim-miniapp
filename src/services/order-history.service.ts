const API_URL = String(
  import.meta.env.VITE_API_URL ?? "",
).replace(/\/$/, "");

const ORDER_IDS_KEY = "tk_customer_order_ids";

export type BackendOrderStatus =
  | "new"
  | "confirmed"
  | "shipping"
  | "completed"
  | "cancelled";

export type BackendPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cod_confirmed";

export type BackendOrderItem = {
  id: string;
  name: string;
  quantity: number;
  amount: number;
};

export type BackendOrder = {
  id: string;
  code: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingMethod: "delivery" | "pickup";
  shippingArea?: "hcm" | "other";
  shippingAddress?: unknown;
  items: BackendOrderItem[];
  paymentMethod: "cash" | "zalopay";
  paymentStatus: BackendPaymentStatus;
  orderStatus?: BackendOrderStatus;
  paymentMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export function readCustomerOrderIds(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_IDS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
  } catch (error) {
    console.warn("Read customer order ids error:", error);
    return [];
  }
}

export function rememberCustomerOrderId(orderId: string): void {
  const normalized = String(orderId ?? "").trim();
  if (!normalized) return;

  const current = readCustomerOrderIds();
  const next = [
    normalized,
    ...current.filter((id) => id !== normalized),
  ].slice(0, 100);

  localStorage.setItem(
    ORDER_IDS_KEY,
    JSON.stringify(next),
  );
}

async function fetchOrder(
  orderId: string,
): Promise<BackendOrder | null> {
  if (!API_URL) {
    console.warn("VITE_API_URL chưa được cấu hình.");
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/orders/${encodeURIComponent(orderId)}?t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error(
        "Fetch customer order failed:",
        response.status,
      );
      return null;
    }

    return (await response.json()) as BackendOrder;
  } catch (error) {
    console.error(
      "Fetch customer order network error:",
      error,
    );
    return null;
  }
}

export async function fetchCustomerOrders(): Promise<BackendOrder[]> {
  const ids = readCustomerOrderIds();

  if (ids.length === 0) {
    return [];
  }

  const results = await Promise.all(
    ids.map((id) => fetchOrder(id)),
  );

  return results
    .filter(
      (order): order is BackendOrder =>
        Boolean(order),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
}
