import { promises as fs } from "node:fs";
import path from "node:path";

export type PaymentMethod = "cash" | "zalopay";
export type PaymentStatus = "pending" | "paid" | "failed" | "cod_confirmed";
export type ShippingMethod = "delivery" | "pickup";
export type ShippingArea = "hcm" | "other";
export type OrderStatus = "new" | "confirmed" | "shipping" | "completed" | "cancelled";

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  amount: number;
};

export type StoreOrder = {
  id: string;
  code: string;
  subtotal: number;
  shippingFee: number;
  discountAmount?: number;
  voucherCode?: string;
  totalAmount: number;
  shippingMethod: ShippingMethod;
  shippingArea?: ShippingArea;
  shippingAddress?: unknown;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus?: OrderStatus;
  checkoutOrderId?: string;
  paymentTransactionId?: string;
  providerMethod?: string;
  paymentMessage?: string;
  createdAt: string;
  updatedAt: string;
};

type OrderDb = Record<string, StoreOrder>;

const filePath = path.resolve(
  process.env.ORDER_STORE_FILE || "./data/orders.json",
);

let queue: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<OrderDb> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content || "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as OrderDb)
      : {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeDb(db: OrderDb): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

function mutate<T>(fn: (db: OrderDb) => Promise<T> | T): Promise<T> {
  const next = queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}

export async function saveOrder(order: StoreOrder): Promise<void> {
  await mutate((db) => {
    db[order.id] = {
      ...order,
      orderStatus: order.orderStatus ?? "new",
    };
  });
}

export async function findOrderById(id: string): Promise<StoreOrder | null> {
  const order = (await readDb())[String(id).trim()] ?? null;
  return order
    ? { ...order, orderStatus: order.orderStatus ?? "new" }
    : null;
}

export async function listOrders(): Promise<StoreOrder[]> {
  const db = await readDb();
  return Object.values(db)
    .map((order) => ({
      ...order,
      orderStatus: order.orderStatus ?? "new",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<StoreOrder | null> {
  return mutate((db) => {
    const order = db[String(id).trim()];
    if (!order) return null;
    order.orderStatus = status;
    order.updatedAt = new Date().toISOString();
    return order;
  });
}

export async function bindCheckoutOrder(
  merchantOrderId: string,
  checkoutOrderId: string,
): Promise<StoreOrder> {
  return mutate((db) => {
    const order = db[String(merchantOrderId).trim()];
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    order.checkoutOrderId = String(checkoutOrderId).trim();
    order.updatedAt = new Date().toISOString();
    return order;
  });
}

export async function findOrderByCheckoutOrderId(
  id: string,
): Promise<StoreOrder | null> {
  const checkoutOrderId = String(id).trim();
  const db = await readDb();
  const order =
    Object.values(db).find(
      (entry) => String(entry.checkoutOrderId ?? "").trim() === checkoutOrderId,
    ) ?? null;
  return order
    ? { ...order, orderStatus: order.orderStatus ?? "new" }
    : null;
}

export async function findOrderByTransactionId(
  id: string,
): Promise<StoreOrder | null> {
  const transactionId = String(id).trim();
  const db = await readDb();
  const order =
    Object.values(db).find(
      (entry) =>
        String(entry.paymentTransactionId ?? "").trim() === transactionId,
    ) ?? null;
  return order
    ? { ...order, orderStatus: order.orderStatus ?? "new" }
    : null;
}

export async function updateCodNotify(input: {
  checkoutOrderId: string;
  providerMethod: string;
}): Promise<StoreOrder | null> {
  return mutate((db) => {
    const checkoutOrderId = String(input.checkoutOrderId).trim();
    const order = Object.values(db).find(
      (entry) => String(entry.checkoutOrderId ?? "").trim() === checkoutOrderId,
    );
    if (!order) return null;
    order.paymentStatus = "cod_confirmed";
    order.providerMethod = String(input.providerMethod);
    order.paymentMessage = "Đơn COD đã được xác nhận";
    order.updatedAt = new Date().toISOString();
    return order;
  });
}

export async function updateOnlinePayment(input: {
  merchantOrderId: string;
  checkoutOrderId: string;
  transId: string;
  providerMethod?: string;
  message?: string;
  success: boolean;
}): Promise<StoreOrder> {
  return mutate((db) => {
    const order = db[String(input.merchantOrderId).trim()];
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    order.checkoutOrderId = String(input.checkoutOrderId).trim();
    order.paymentTransactionId = String(input.transId).trim();
    order.providerMethod = input.providerMethod;
    order.paymentMessage = input.message;
    order.paymentStatus = input.success ? "paid" : "failed";
    order.updatedAt = new Date().toISOString();
    return order;
  });
}
