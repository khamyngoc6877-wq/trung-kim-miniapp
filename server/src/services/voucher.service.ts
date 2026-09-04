import crypto from "node:crypto";
import { pool } from "../lib/db.js";

export type VoucherType = "percent" | "fixed";

export type Voucher = {
  id: string;
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startAt?: string;
  endAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VoucherInput = {
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startAt?: string;
  endAt?: string;
  active?: boolean;
};

function normalizeCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function validateInput(input: VoucherInput): void {
  const code = normalizeCode(input.code);
  const value = Number(input.value);
  const minOrder = Number(input.minOrder ?? 0);
  const maxDiscount = input.maxDiscount == null ? undefined : Number(input.maxDiscount);
  const usageLimit = input.usageLimit == null ? undefined : Number(input.usageLimit);

  if (!code) throw new Error("Mã voucher không được để trống");
  if (!String(input.name ?? "").trim()) throw new Error("Tên voucher không được để trống");
  if (input.type !== "percent" && input.type !== "fixed") throw new Error("Loại voucher không hợp lệ");
  if (!Number.isFinite(value) || value <= 0) throw new Error("Giá trị giảm không hợp lệ");
  if (input.type === "percent" && value > 100) throw new Error("Phần trăm giảm không được vượt quá 100%");
  if (!Number.isFinite(minOrder) || minOrder < 0) throw new Error("Đơn tối thiểu không hợp lệ");
  if (maxDiscount !== undefined && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) throw new Error("Mức giảm tối đa không hợp lệ");
  if (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit < 1)) throw new Error("Số lượt sử dụng không hợp lệ");
}

function rowToVoucher(row: any): Voucher {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    value: Number(row.value),
    minOrder: Number(row.min_order),
    maxDiscount: row.max_discount == null ? undefined : Number(row.max_discount),
    usageLimit: row.usage_limit == null ? undefined : Number(row.usage_limit),
    usedCount: Number(row.used_count),
    startAt: row.start_at ? new Date(row.start_at).toISOString() : undefined,
    endAt: row.end_at ? new Date(row.end_at).toISOString() : undefined,
    active: Boolean(row.active),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listVouchers(): Promise<Voucher[]> {
  const { rows } = await pool.query("select * from public.vouchers order by created_at desc");
  return rows.map(rowToVoucher);
}

export async function createVoucher(input: VoucherInput): Promise<Voucher> {
  validateInput(input);
  const code = normalizeCode(input.code);
  const now = new Date().toISOString();
  try {
    const { rows } = await pool.query(
      `insert into public.vouchers
       (id, code, name, type, value, min_order, max_discount, usage_limit, used_count, start_at, end_at, active, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,$12,$12)
       returning *`,
      [crypto.randomUUID(), code, String(input.name).trim(), input.type, Number(input.value),
       Number(input.minOrder ?? 0), input.maxDiscount ?? null, input.usageLimit ?? null,
       input.startAt || null, input.endAt || null, input.active ?? true, now],
    );
    return rowToVoucher(rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") throw new Error("Mã voucher đã tồn tại");
    throw e;
  }
}

export async function updateVoucher(id: string, input: VoucherInput): Promise<Voucher | null> {
  validateInput(input);
  try {
    const { rows } = await pool.query(
      `update public.vouchers set
       code=$2,name=$3,type=$4,value=$5,min_order=$6,max_discount=$7,usage_limit=$8,
       start_at=$9,end_at=$10,active=$11,updated_at=now()
       where id=$1 returning *`,
      [String(id).trim(), normalizeCode(input.code), String(input.name).trim(), input.type,
       Number(input.value), Number(input.minOrder ?? 0), input.maxDiscount ?? null,
       input.usageLimit ?? null, input.startAt || null, input.endAt || null, input.active ?? true],
    );
    return rows[0] ? rowToVoucher(rows[0]) : null;
  } catch (e: any) {
    if (e?.code === "23505") throw new Error("Mã voucher đã tồn tại");
    throw e;
  }
}

export async function deleteVoucher(id: string): Promise<boolean> {
  const result = await pool.query("delete from public.vouchers where id=$1", [String(id).trim()]);
  return (result.rowCount ?? 0) > 0;
}

export type VoucherValidation = {
  valid: boolean;
  message: string;
  voucher?: Voucher;
  discountAmount: number;
};

export async function validateVoucher(codeValue: unknown, subtotalValue: unknown): Promise<VoucherValidation> {
  const code = normalizeCode(codeValue);
  const subtotal = Number(subtotalValue);
  if (!code) return { valid:false, message:"Vui lòng nhập mã voucher", discountAmount:0 };
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { valid:false, message:"Giá trị đơn hàng không hợp lệ", discountAmount:0 };

  const { rows } = await pool.query("select * from public.vouchers where code=$1 limit 1", [code]);
  if (!rows[0]) return { valid:false, message:"Mã voucher không tồn tại", discountAmount:0 };
  const voucher = rowToVoucher(rows[0]);
  if (!voucher.active) return { valid:false, message:"Voucher đang tạm ngưng", discountAmount:0 };

  const now = Date.now();
  if (voucher.startAt && now < new Date(voucher.startAt).getTime()) return { valid:false, message:"Voucher chưa đến thời gian sử dụng", discountAmount:0 };
  if (voucher.endAt && now > new Date(voucher.endAt).getTime()) return { valid:false, message:"Voucher đã hết hạn", discountAmount:0 };
  if (voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) return { valid:false, message:"Voucher đã hết lượt sử dụng", discountAmount:0 };
  if (subtotal < voucher.minOrder) return { valid:false, message:`Đơn hàng tối thiểu ${voucher.minOrder.toLocaleString("vi-VN")}đ`, discountAmount:0 };

  let discount = voucher.type === "percent" ? subtotal * (voucher.value / 100) : voucher.value;
  if (voucher.maxDiscount !== undefined && voucher.maxDiscount > 0) discount = Math.min(discount, voucher.maxDiscount);
  discount = Math.max(0, Math.round(Math.min(discount, subtotal)));
  return { valid:true, message:"Áp dụng voucher thành công", voucher, discountAmount:discount };
}

export async function consumeVoucher(codeValue: unknown): Promise<void> {
  const code = normalizeCode(codeValue);
  if (!code) return;
  await pool.query(
    `update public.vouchers set used_count=used_count+1, updated_at=now()
     where code=$1 and active=true and (usage_limit is null or used_count < usage_limit)`,
    [code],
  );
}
