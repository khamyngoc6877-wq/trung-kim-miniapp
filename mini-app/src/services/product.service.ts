import type { ApiProduct } from "../types/product-api";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export async function getProducts(): Promise<ApiProduct[]> {
  const res = await fetch(`${API_URL}/api/products`);
  if (!res.ok) throw new Error("Không thể tải danh sách sản phẩm");
  return res.json();
}
export async function getProduct(id: string): Promise<ApiProduct> {
  const res = await fetch(`${API_URL}/api/products/${id}`);
  if (!res.ok) throw new Error("Không thể tải sản phẩm");
  return res.json();
}
