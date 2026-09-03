import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Product, ProductInput, ProductVariant } from "../types/product.js";

const DATA_FILE = process.env.PRODUCT_STORE_FILE || path.resolve(process.cwd(), "data/products.json");

async function ensureStore(): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAll(): Promise<Product[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function writeAll(products: Product[]): Promise<void> {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), "utf8");
}

function normalizeVariants(variants: ProductVariant[] = []): ProductVariant[] {
  return variants.map((v) => ({
    ...v,
    id: v.id || crypto.randomUUID(),
    price: Number(v.price || 0),
    stock: Number(v.stock || 0),
    compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
  }));
}

export async function listProducts(includeHidden = false): Promise<Product[]> {
  const products = await readAll();
  return products
    .filter((p) => includeHidden || p.status === "active")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const products = await readAll();
  return products.find((p) => p.id === id);
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const products = await readAll();
  const now = new Date().toISOString();
  const product: Product = {
    ...input,
    id: crypto.randomUUID(),
    sku: String(input.sku || "").trim(),
    name: String(input.name || "").trim(),
    category: String(input.category || "").trim(),
    price: Number(input.price || 0),
    stock: Number(input.stock || 0),
    compareAtPrice: input.compareAtPrice ? Number(input.compareAtPrice) : undefined,
    images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
    variants: normalizeVariants(input.variants),
    status: input.status === "hidden" ? "hidden" : "active",
    createdAt: now,
    updatedAt: now,
  };
  products.push(product);
  await writeAll(products);
  return product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product | undefined> {
  const products = await readAll();
  const index = products.findIndex((p) => p.id === id);
  if (index < 0) return undefined;
  const current = products[index];
  const next: Product = {
    ...current,
    ...input,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    price: input.price !== undefined ? Number(input.price) : current.price,
    stock: input.stock !== undefined ? Number(input.stock) : current.stock,
    compareAtPrice: input.compareAtPrice ? Number(input.compareAtPrice) : undefined,
    images: input.images ? input.images.filter(Boolean) : current.images,
    variants: input.variants ? normalizeVariants(input.variants) : current.variants,
  };
  products[index] = next;
  await writeAll(products);
  return next;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await readAll();
  const next = products.filter((p) => p.id !== id);
  if (next.length === products.length) return false;
  await writeAll(next);
  return true;
}
