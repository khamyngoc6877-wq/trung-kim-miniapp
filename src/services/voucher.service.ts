const API_URL = String(
  import.meta.env.VITE_API_URL ?? "",
).replace(/\/$/, "");

export type VoucherValidationResult = {
  valid: boolean;
  message: string;
  discountAmount: number;
  voucher?: {
    id: string;
    code: string;
    name: string;
    type: "percent" | "fixed";
    value: number;
    minOrder: number;
    maxDiscount?: number;
  };
};

export async function validateVoucher(
  code: string,
  subtotal: number,
): Promise<VoucherValidationResult> {
  if (!API_URL) throw new Error("Chưa cấu hình VITE_API_URL");

  const response = await fetch(`${API_URL}/api/vouchers/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, subtotal }),
  });

  const result = (await response.json().catch(() => null)) as
    | VoucherValidationResult
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(result?.message || "Voucher không hợp lệ");
  }

  return result as VoucherValidationResult;
}
