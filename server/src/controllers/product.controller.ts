import type { Request, Response } from "express";
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from "../services/product.service.js";
import type { ProductInput } from "../types/product.js";

function validate(body: Partial<ProductInput>): string | null {
  if (!String(body.sku || "").trim()) return "Thiếu mã sản phẩm";
  if (!String(body.name || "").trim()) return "Thiếu tên sản phẩm";
  if (!String(body.category || "").trim()) return "Thiếu danh mục";
  if (Number(body.price) < 0 || Number.isNaN(Number(body.price))) return "Giá bán không hợp lệ";
  if (Number(body.stock) < 0 || Number.isNaN(Number(body.stock))) return "Tồn kho không hợp lệ";
  return null;
}

export async function publicList(req: Request, res: Response): Promise<void> {
  res.json(await listProducts(false));
}
export async function publicGet(req: Request, res: Response): Promise<void> {
  const p = await getProduct(req.params.id);
  if (!p || p.status !== "active") { res.status(404).json({ message: "Không tìm thấy sản phẩm" }); return; }
  res.json(p);
}
export async function adminList(req: Request, res: Response): Promise<void> {
  res.json(await listProducts(true));
}
export async function adminCreate(req: Request, res: Response): Promise<void> {
  const error = validate(req.body);
  if (error) { res.status(400).json({ message: error }); return; }
  res.status(201).json(await createProduct(req.body));
}
export async function adminUpdate(req: Request, res: Response): Promise<void> {
  const current = await getProduct(req.params.id);
  if (!current) { res.status(404).json({ message: "Không tìm thấy sản phẩm" }); return; }
  const merged = { ...current, ...req.body };
  const error = validate(merged);
  if (error) { res.status(400).json({ message: error }); return; }
  res.json(await updateProduct(req.params.id, req.body));
}
export async function adminDelete(req: Request, res: Response): Promise<void> {
  const ok = await deleteProduct(req.params.id);
  if (!ok) { res.status(404).json({ message: "Không tìm thấy sản phẩm" }); return; }
  res.status(204).end();
}
