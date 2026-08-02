import { promises as fs } from "node:fs";
import path from "node:path";

export type PaymentMethod = "cash" | "zalopay";
export type PaymentStatus = "pending" | "paid" | "failed" | "cod_confirmed";
export type ShippingMethod = "delivery" | "pickup";
export type ShippingArea = "hcm" | "other";

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
  totalAmount: number;
  shippingMethod: ShippingMethod;
  shippingArea?: ShippingArea;
  shippingAddress?: unknown;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  checkoutOrderId?: string;
  paymentTransactionId?: string;
  providerMethod?: string;
  paymentMessage?: string;
  createdAt: string;
  updatedAt: string;
};

type OrderDb = Record<string, StoreOrder>;
const filePath = path.resolve(process.env.ORDER_STORE_FILE || "./data/orders.json");
let queue: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<OrderDb> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as OrderDb;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeDb(db: OrderDb): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  await fs.writeFile(temp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(temp, filePath);
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
  await mutate((db) => { db[order.id] = order; });
}

export async function findOrderById(id: string): Promise<StoreOrder | null> {
  return (await readDb())[id] ?? null;
}

export async function bindCheckoutOrder(merchantOrderId: string, checkoutOrderId: string): Promise<void> {
  await mutate((db) => {
    const order = db[merchantOrderId];
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    order.checkoutOrderId = checkoutOrderId;
    order.updatedAt = new Date().toISOString();
  });
}

export async function findOrderByCheckoutOrderId(id: string): Promise<StoreOrder | null> {
  return Object.values(await readDb()).find((order) => order.checkoutOrderId === id) ?? null;
}

export async function findOrderByTransactionId(id: string): Promise<StoreOrder | null> {
  return Object.values(await readDb()).find((order) => order.paymentTransactionId === id) ?? null;
}

export async function updateCodNotify(input: { checkoutOrderId: string; providerMethod: string }): Promise<StoreOrder | null> {
  return mutate((db) => {
    const order = Object.values(db).find((entry) => entry.checkoutOrderId === input.checkoutOrderId);
    if (!order) return null;
    order.paymentStatus = "cod_confirmed";
    order.providerMethod = input.providerMethod;
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
}): Promise<void> {
  await mutate((db) => {
    const order = db[input.merchantOrderId];
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    order.checkoutOrderId = input.checkoutOrderId;
    order.paymentTransactionId = input.transId;
    order.providerMethod = input.providerMethod;
    order.paymentMessage = input.message;
    order.paymentStatus = input.success ? "paid" : "failed";
    order.updatedAt = new Date().toISOString();
  });
}
