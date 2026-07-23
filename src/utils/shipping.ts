export type ShippingArea = "hcm" | "other";

export type ShippingMethod =
  | "delivery"
  | "pickup";

type CalculateShippingFeeParams = {
  subtotal: number;
  area: ShippingArea;
  method: ShippingMethod;
};

export const FREE_SHIPPING_MINIMUM =
  3_000_000;

/**
 * Chuyển tiếng Việt có dấu thành không dấu.
 *
 * Ví dụ:
 * "Thành phố Hồ Chí Minh"
 * → "thanh pho ho chi minh"
 */
function normalizeText(value?: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[.,/\\()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tự nhận dạng khu vực từ chuỗi địa chỉ.
 */
export function detectShippingArea(
  address?: string,
): ShippingArea {
  const normalizedAddress =
    normalizeText(address);

  if (!normalizedAddress) {
    return "other";
  }

  const hcmKeywords = [
    "thanh pho ho chi minh",
    "tp ho chi minh",
    "tphcm",
    "ho chi minh",
    "sai gon",
  ];

  const isHcm = hcmKeywords.some(
    (keyword) =>
      normalizedAddress.includes(keyword),
  );

  return isHcm ? "hcm" : "other";
}

/**
 * Tính phí vận chuyển.
 */
export function calculateShippingFee({
  subtotal,
  area,
  method,
}: CalculateShippingFeeParams): number {
  // Khách tự đến lấy hàng
  if (method === "pickup") {
    return 0;
  }

  // Đơn từ 3 triệu được miễn phí giao hàng
  if (
    subtotal >= FREE_SHIPPING_MINIMUM
  ) {
    return 0;
  }

  // Phí giao hàng theo khu vực
  return area === "hcm"
    ? 25_000
    : 40_000;
}