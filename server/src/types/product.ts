export type ProductStatus =
  | "active"
  | "hidden";

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
}

export interface Product {
  id: string;
  sku: string;

  // Tên sản phẩm đa ngôn ngữ
  name: string;
  nameZh?: string;
  nameEn?: string;

  category: string;
  brand?: string;

  price: number;
  compareAtPrice?: number;
  stock: number;

  // Mô tả đa ngôn ngữ
  description?: string;
  descriptionZh?: string;
  descriptionEn?: string;

  specifications?: string;
  images: string[];
  variants: ProductVariant[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<
  Product,
  "id" | "createdAt" | "updatedAt"
>;