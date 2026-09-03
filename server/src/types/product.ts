export type ProductStatus = "active" | "hidden";

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
  name: string;
  nameZh?: string;
  category: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  description?: string;
  specifications?: string;
  images: string[];
  variants: ProductVariant[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
