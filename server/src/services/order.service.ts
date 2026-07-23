import fs from "node:fs/promises";
import path from "node:path";

export type PaymentMethod = "cash" | "zalopay";
export type PaymentStatus = "pending" | "paid" | "failed";

export type OrderItem = {
  id: string;
  name?: string;
  quantity?: number;
  amount: number;
};

export type StoreOrder = {
  id: string;
  code: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingMethod: "delivery" | "pickup";
  shippingArea?: "hcm" | "other";
  shippingAddress?: unknown;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  checkoutOrderId?: string;
  paymentTransactionId?: string;
  paymentProviderMethod?: string;
  paymentMessage?: string;
  createdAt: string;
  updatedAt: string;
};

type OrderDb = Record<string, StoreOrder>;

const storeFile = path.resolve(
  process.env.ORDER_STORE_FILE ?? "./data/orders.json",
);

let writeQueue: Promise<void> = Promise.resolve();

async function readDb(): Promise<OrderDb> {
  try {
    return JSON.parse(await fs.readFile(storeFile, "utf8")) as OrderDb;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return {};
    throw error;
  }
}

async function writeDb(db: OrderDb): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(storeFile), { recursive: true });
    const temp = `${storeFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(temp, storeFile);
  });
  return writeQueue;
}

export async function saveOrder(order: StoreOrder): Promise<void> {
  const db = await readDb();
  db[order.id] = order;
  await writeDb(db);
}

export async function findOrderById(id: string): Promise<StoreOrder | null> {
  const db = await readDb();
  return db[id] ?? null;
}

export async function findOrderByCheckoutOrderId(
  checkoutOrderId: string,
): Promise<StoreOrder | null> {
  const db = await readDb();
  return Object.values(db).find((o) => o.checkoutOrderId === checkoutOrderId) ?? null;
}

export async function findOrderByTransactionId(
  transId: string,
): Promise<StoreOrder | null> {
  const db = await readDb();
  return Object.values(db).find((o) => o.paymentTransactionId === transId) ?? null;
}

export async function bindCheckoutOrder(
  merchantOrderId: string,
  checkoutOrderId: string,
): Promise<StoreOrder> {
  const db = await readDb();
  const order = db[merchantOrderId];
  if (!order) throw new Error("Không tìm thấy đơn hàng nội bộ");

  order.checkoutOrderId = checkoutOrderId;
  order.updatedAt = new Date().toISOString();
  db[merchantOrderId] = order;
  await writeDb(db);
  return order;
}

export async function updateCodNotify(input: {
  checkoutOrderId: string;
  providerMethod: string;
}): Promise<StoreOrder | null> {
  const db = await readDb();
  const order = Object.values(db).find(
    (item) => item.checkoutOrderId === input.checkoutOrderId,
  );
  if (!order) return null;

  order.paymentStatus = "pending";
  order.paymentProviderMethod = input.providerMethod;
  order.updatedAt = new Date().toISOString();
  db[order.id] = order;
  await writeDb(db);
  return order;
}

export async function updateOnlinePayment(input: {
  merchantOrderId: string;
  checkoutOrderId: string;
  transId: string;
  providerMethod?: string;
  message?: string;
  success: boolean;
}): Promise<StoreOrder> {
  const db = await readDb();
  const order = db[input.merchantOrderId];
  if (!order) throw new Error("Không tìm thấy đơn hàng nội bộ");

  order.checkoutOrderId = input.checkoutOrderId;
  order.paymentTransactionId = input.transId;
  order.paymentProviderMethod = input.providerMethod;
  order.paymentMessage = input.message;
  order.paymentStatus = input.success ? "paid" : "failed";
  order.updatedAt = new Date().toISOString();
  db[order.id] = order;
  await writeDb(db);
  return order;
}
