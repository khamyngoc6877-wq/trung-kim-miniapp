import { Payment } from "zmp-sdk/apis";
import type {
  CheckoutOrderResult,
  PaymentItem,
  PaymentMethod,
  PendingPayment,
  StoredOrder,
} from "@/types/payment";

export const PENDING_PAYMENT_KEY = "trung-kim.pending-payment";

const API_URL = String(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type ApiError = {
  message?: string;
  error?: string;
};

type SignedPaymentData = {
  amount: number;
  desc: string;
  item: PaymentItem[];
  extradata: string;
  method: string;
  mac: string;
};

function ensureApiUrl(): void {
  if (!API_URL) {
    throw new Error("Thiếu VITE_API_URL trong file .env của Mini App");
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  ensureApiUrl();
  const url = `${API_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error("Không thể kết nối backend", { url, error });
    throw new Error(`Không thể kết nối máy chủ ${API_URL}`);
  }

  const result = await readJson<T & ApiError>(response);
  if (!response.ok) {
    throw new Error(
      result?.message ?? result?.error ?? `Máy chủ trả lỗi ${response.status}`,
    );
  }
  if (!result) {
    throw new Error("Máy chủ không trả về JSON hợp lệ");
  }

  return result;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getOrderStatus(orderId: string): Promise<StoredOrder> {
  if (!orderId.trim()) throw new Error("Thiếu mã đơn hàng");
  return requestJson<StoredOrder>(
    `/api/orders/${encodeURIComponent(orderId)}?t=${Date.now()}`,
    { method: "GET", cache: "no-store" },
  );
}

async function getSignedPaymentData(orderId: string): Promise<SignedPaymentData> {
  if (!orderId.trim()) throw new Error("Thiếu mã đơn hàng nội bộ");

  const result = await postJson<SignedPaymentData>(
    "/api/payments/create-signature",
    { orderId },
  );

  if (!Number.isFinite(result.amount) || result.amount <= 0) {
    throw new Error("Backend trả amount không hợp lệ");
  }
  if (!Array.isArray(result.item) || result.item.length === 0) {
    throw new Error("Backend trả item không hợp lệ");
  }
  if (!result.desc || !result.extradata || !result.method || !result.mac) {
    throw new Error("Backend trả dữ liệu ký không đầy đủ");
  }

  return result;
}

async function bindCheckoutOrder(
  merchantOrderId: string,
  checkoutOrderId: string,
): Promise<void> {
  await postJson<{ success: boolean }>(
    "/api/payments/bind-checkout-order",
    { merchantOrderId, checkoutOrderId },
  );
}

function normalizeSdkError(error: unknown): Error {
  if (error instanceof Error) return error;

  if (typeof error === "object" && error) {
    const value = error as {
      message?: string;
      errorMessage?: string;
      code?: string | number;
      errCode?: string | number;
    };
    const code = value.code ?? value.errCode;
    return new Error(
      value.message ??
        value.errorMessage ??
        `Checkout SDK thất bại${code !== undefined ? ` (${code})` : ""}`,
    );
  }

  return new Error(String(error || "Checkout SDK thất bại"));
}

export function readPendingPayment(): PendingPayment | null {
  const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingPayment;
  } catch {
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    return null;
  }
}

export function savePendingPayment(value: PendingPayment): void {
  sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(value));
}

export function clearPendingPayment(): void {
  sessionStorage.removeItem(PENDING_PAYMENT_KEY);
}

export async function createCheckoutPayment(
  merchantOrderId: string,
  paymentMethod: PaymentMethod,
): Promise<CheckoutOrderResult> {
  const pending: PendingPayment = {
    merchantOrderId,
    paymentMethod,
    createdAt: Date.now(),
  };
  savePendingPayment(pending);

  try {
    const signedData = await getSignedPaymentData(merchantOrderId);

    console.log("Checkout request", {
      merchantOrderId,
      paymentMethod,
      amount: signedData.amount,
      method: signedData.method,
      itemCount: signedData.item.length,
      hasMac: Boolean(signedData.mac),
      macLength: signedData.mac.length,
    });

    const rawResult = await Payment.createOrder({
      amount: signedData.amount,
      desc: signedData.desc,
      item: signedData.item,
      extradata: signedData.extradata,
      method: signedData.method,
      mac: signedData.mac,
    });

    const result = rawResult as { orderId?: string } | null | undefined;
    const checkoutOrderId = String(result?.orderId ?? "").trim();

    if (!checkoutOrderId) {
      throw new Error(
        "Checkout SDK không trả về orderId. Hãy thử trong ứng dụng Zalo và kiểm tra cấu hình phương thức thanh toán.",
      );
    }

    savePendingPayment({ ...pending, checkoutOrderId });
    await bindCheckoutOrder(merchantOrderId, checkoutOrderId);

    return { orderId: checkoutOrderId };
  } catch (error) {
    clearPendingPayment();
    console.error("Payment.createOrder failed", error);
    throw normalizeSdkError(error);
  }
}
