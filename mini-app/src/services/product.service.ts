import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  Product,
  ProductInput,
  ProductVariant,
} from "../types/product.js";

const DATA_FILE =
  process.env.PRODUCT_STORE_FILE ||
  path.resolve(process.cwd(), "data/products.json");

async function ensureStore(): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), {
    recursive: true,
  });

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
    const value = JSON.parse(raw || "[]") as unknown;

    return Array.isArray(value)
      ? (value as Product[])
      : [];
  } catch (error) {
    console.error("PRODUCT_STORE_READ_ERROR:", error);
    return [];
  }
}

async function writeAll(
  products: Product[],
): Promise<void> {
  await ensureStore();

  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(products, null, 2),
    "utf8",
  );
}

function normalizeVariants(
  variants: ProductVariant[] = [],
): ProductVariant[] {
  return variants.map((variant) => ({
    ...variant,
    id:
      String(variant.id ?? "").trim() ||
      crypto.randomUUID(),
    name: String(variant.name ?? "").trim(),
    sku:
      variant.sku !== undefined
        ? String(variant.sku).trim() || undefined
        : undefined,
    price: Number(variant.price ?? 0),
    stock: Number(variant.stock ?? 0),
    compareAtPrice:
      variant.compareAtPrice !== undefined
        ? Number(variant.compareAtPrice)
        : undefined,
  }));
}

function normalizeImages(images: unknown): string[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => String(image ?? "").trim())
    .filter(Boolean);
}

export async function listProducts(
  includeHidden = false,
): Promise<Product[]> {
  const products = await readAll();

  return products
    .filter(
      (product) =>
        includeHidden ||
        product.status === "active",
    )
    .sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(
        String(a.updatedAt ?? ""),
      ),
    );
}

export async function getProduct(
  id: string,
): Promise<Product | undefined> {
  const productId = String(id ?? "").trim();

  if (!productId) {
    return undefined;
  }

  const products = await readAll();

  return products.find(
    (product) => product.id === productId,
  );
}

export async function createProduct(
  input: ProductInput,
): Promise<Product> {
  const products = await readAll();
  const now = new Date().toISOString();

  const product: Product = {
    id: crypto.randomUUID(),
    sku: String(input.sku ?? "").trim(),
    name: String(input.name ?? "").trim(),
    nameZh: input.nameZh
      ? String(input.nameZh).trim()
      : undefined,
    category: String(input.category ?? "").trim(),
    brand: input.brand
      ? String(input.brand).trim()
      : undefined,
    price: Number(input.price ?? 0),
    compareAtPrice:
      input.compareAtPrice !== undefined
        ? Number(input.compareAtPrice)
        : undefined,
    stock: Number(input.stock ?? 0),
    description: input.description,
    specifications: input.specifications,
    images: normalizeImages(input.images),
    variants: normalizeVariants(
      Array.isArray(input.variants)
        ? input.variants
        : [],
    ),
    status:
      input.status === "hidden"
        ? "hidden"
        : "active",
    createdAt: now,
    updatedAt: now,
  };

  products.push(product);
  await writeAll(products);

  return product;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<Product | undefined> {
  const productId = String(id ?? "").trim();

  if (!productId) {
    return undefined;
  }

  const products = await readAll();

  const index = products.findIndex(
    (product) => product.id === productId,
  );

  if (index < 0) {
    return undefined;
  }

  const current = products[index];

  if (!current) {
    return undefined;
  }

  const next: Product = {
    ...current,

    sku:
      input.sku !== undefined
        ? String(input.sku).trim()
        : current.sku,

    name:
      input.name !== undefined
        ? String(input.name).trim()
        : current.name,

    nameZh:
      input.nameZh !== undefined
        ? String(input.nameZh).trim() || undefined
        : current.nameZh,

    category:
      input.category !== undefined
        ? String(input.category).trim()
        : current.category,

    brand:
      input.brand !== undefined
        ? String(input.brand).trim() || undefined
        : current.brand,

    price:
      input.price !== undefined
        ? Number(input.price)
        : current.price,

    compareAtPrice:
      input.compareAtPrice !== undefined
        ? Number(input.compareAtPrice)
        : current.compareAtPrice,

    stock:
      input.stock !== undefined
        ? Number(input.stock)
        : current.stock,

    description:
      input.description !== undefined
        ? input.description
        : current.description,

    specifications:
      input.specifications !== undefined
        ? input.specifications
        : current.specifications,

    images:
      input.images !== undefined
        ? normalizeImages(input.images)
        : current.images,

    variants:
      input.variants !== undefined
        ? normalizeVariants(
            Array.isArray(input.variants)
              ? input.variants
              : [],
          )
        : current.variants,

    status:
      input.status !== undefined
        ? input.status
        : current.status,

    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  products[index] = next;

  await writeAll(products);

  return next;
}

export async function deleteProduct(
  id: string,
): Promise<boolean> {
  const productId = String(id ?? "").trim();

  if (!productId) {
    return false;
  }

  const products = await readAll();

  const next = products.filter(
    (product) => product.id !== productId,
  );

  if (next.length === products.length) {
    return false;
  }

  await writeAll(next);

  return true;
}