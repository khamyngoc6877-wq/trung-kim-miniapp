import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

type VoucherDb = Record<string, Voucher>;

const filePath = path.resolve(
  process.env.VOUCHER_STORE_FILE || "./data/vouchers.json",
);

let queue: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<VoucherDb> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content || "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as VoucherDb)
      : {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeDb(db: VoucherDb): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  await fs.writeFile(temp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(temp, filePath);
}

function mutate<T>(fn: (db: VoucherDb) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}

function normalizeCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function validateInput(input: VoucherInput): void {
  const code = normalizeCode(input.code);
  const value = Number(input.value);
  const minOrder = Number(input.minOrder ?? 0);
  const maxDiscount =
    input.maxDiscount === undefined || input.maxDiscount === null
      ? undefined
      : Number(input.maxDiscount);
  const usageLimit =
    input.usageLimit === undefined || input.usageLimit === null
      ? undefined
      : Number(input.usageLimit);

  if (!code) throw new Error("Mã voucher không được để trống");
  if (!String(input.name ?? "").trim()) throw new Error("Tên voucher không được để trống");
  if (input.type !== "percent" && input.type !== "fixed") {
    throw new Error("Loại voucher không hợp lệ");
  }
  if (!Number.isFinite(value) || value <= 0) throw new Error("Giá trị giảm không hợp lệ");
  if (input.type === "percent" && value > 100) throw new Error("Phần trăm giảm không được vượt quá 100%");
  if (!Number.isFinite(minOrder) || minOrder < 0) throw new Error("Đơn tối thiểu không hợp lệ");
  if (maxDiscount !== undefined && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) {
    throw new Error("Mức giảm tối đa không hợp lệ");
  }
  if (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    throw new Error("Số lượt sử dụng không hợp lệ");
  }
}

export async function listVouchers(): Promise<Voucher[]> {
  return Object.values(await readDb()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createVoucher(input: VoucherInput): Promise<Voucher> {
  validateInput(input);
  return mutate((db) => {
    const code = normalizeCode(input.code);
    if (Object.values(db).some((v) => v.code === code)) {
      throw new Error("Mã voucher đã tồn tại");
    }
    const now = new Date().toISOString();
    const voucher: Voucher = {
      id: crypto.randomUUID(),
      code,
      name: String(input.name).trim(),
      type: input.type,
      value: Number(input.value),
      minOrder: Number(input.minOrder ?? 0),
      maxDiscount:
        input.maxDiscount === undefined || input.maxDiscount === null
          ? undefined
          : Number(input.maxDiscount),
      usageLimit:
        input.usageLimit === undefined || input.usageLimit === null
          ? undefined
          : Number(input.usageLimit),
      usedCount: 0,
      startAt: input.startAt || undefined,
      endAt: input.endAt || undefined,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    db[voucher.id] = voucher;
    return voucher;
  });
}

export async function updateVoucher(
  id: string,
  input: VoucherInput,
): Promise<Voucher | null> {
  validateInput(input);
  return mutate((db) => {
    const current = db[String(id).trim()];
    if (!current) return null;

    const code = normalizeCode(input.code);
    if (
      Object.values(db).some(
        (v) => v.id !== current.id && v.code === code,
      )
    ) {
      throw new Error("Mã voucher đã tồn tại");
    }

    const next: Voucher = {
      ...current,
      code,
      name: String(input.name).trim(),
      type: input.type,
      value: Number(input.value),
      minOrder: Number(input.minOrder ?? 0),
      maxDiscount:
        input.maxDiscount === undefined || input.maxDiscount === null
          ? undefined
          : Number(input.maxDiscount),
      usageLimit:
        input.usageLimit === undefined || input.usageLimit === null
          ? undefined
          : Number(input.usageLimit),
      startAt: input.startAt || undefined,
      endAt: input.endAt || undefined,
      active: input.active ?? true,
      updatedAt: new Date().toISOString(),
    };
    db[current.id] = next;
    return next;
  });
}

export async function deleteVoucher(id: string): Promise<boolean> {
  return mutate((db) => {
    const key = String(id).trim();
    if (!db[key]) return false;
    delete db[key];
    return true;
  });
}

export type VoucherValidation = {
  valid: boolean;
  message: string;
  voucher?: Voucher;
  discountAmount: number;
};

export async function validateVoucher(
  codeValue: unknown,
  subtotalValue: unknown,
): Promise<VoucherValidation> {
  const code = normalizeCode(codeValue);
  const subtotal = Number(subtotalValue);

  if (!code) return { valid: false, message: "Vui lòng nhập mã voucher", discountAmount: 0 };
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { valid: false, message: "Giá trị đơn hàng không hợp lệ", discountAmount: 0 };
  }

  const voucher = Object.values(await readDb()).find((v) => v.code === code);
  if (!voucher) return { valid: false, message: "Mã voucher không tồn tại", discountAmount: 0 };
  if (!voucher.active) return { valid: false, message: "Voucher đang tạm ngưng", discountAmount: 0 };

  const now = Date.now();
  if (voucher.startAt && now < new Date(voucher.startAt).getTime()) {
    return { valid: false, message: "Voucher chưa đến thời gian sử dụng", discountAmount: 0 };
  }
  if (voucher.endAt && now > new Date(voucher.endAt).getTime()) {
    return { valid: false, message: "Voucher đã hết hạn", discountAmount: 0 };
  }
  if (voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) {
    return { valid: false, message: "Voucher đã hết lượt sử dụng", discountAmount: 0 };
  }
  if (subtotal < voucher.minOrder) {
    return {
      valid: false,
      message: `Đơn hàng tối thiểu ${voucher.minOrder.toLocaleString("vi-VN")}đ`,
      discountAmount: 0,
    };
  }

  let discount =
    voucher.type === "percent"
      ? subtotal * (voucher.value / 100)
      : voucher.value;

  if (voucher.maxDiscount !== undefined && voucher.maxDiscount > 0) {
    discount = Math.min(discount, voucher.maxDiscount);
  }

  discount = Math.min(discount, subtotal);
  discount = Math.max(0, Math.round(discount));

  return {
    valid: true,
    message: "Áp dụng voucher thành công",
    voucher,
    discountAmount: discount,
  };
}

export async function consumeVoucher(codeValue: unknown): Promise<void> {
  const code = normalizeCode(codeValue);
  if (!code) return;

  await mutate((db) => {
    const voucher = Object.values(db).find((v) => v.code === code);
    if (!voucher) return;
    voucher.usedCount += 1;
    voucher.updatedAt = new Date().toISOString();
  });
}
