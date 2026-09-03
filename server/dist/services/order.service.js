import { promises as fs } from "node:fs";
import path from "node:path";
const filePath = path.resolve(process.env.ORDER_STORE_FILE || "./data/orders.json");
let queue = Promise.resolve();
async function readDb() {
    try {
        const content = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(content || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch (error) {
        if (error.code === "ENOENT")
            return {};
        throw error;
    }
}
async function writeDb(db) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tempPath, filePath);
}
function mutate(fn) {
    const next = queue.then(async () => {
        const db = await readDb();
        const result = await fn(db);
        await writeDb(db);
        return result;
    });
    queue = next.catch(() => undefined);
    return next;
}
export async function saveOrder(order) {
    await mutate((db) => {
        db[order.id] = {
            ...order,
            orderStatus: order.orderStatus ?? "new",
        };
    });
}
export async function findOrderById(id) {
    const order = (await readDb())[String(id).trim()] ?? null;
    return order
        ? { ...order, orderStatus: order.orderStatus ?? "new" }
        : null;
}
export async function listOrders() {
    const db = await readDb();
    return Object.values(db)
        .map((order) => ({
        ...order,
        orderStatus: order.orderStatus ?? "new",
    }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function updateOrderStatus(id, status) {
    return mutate((db) => {
        const order = db[String(id).trim()];
        if (!order)
            return null;
        order.orderStatus = status;
        order.updatedAt = new Date().toISOString();
        return order;
    });
}
export async function bindCheckoutOrder(merchantOrderId, checkoutOrderId) {
    return mutate((db) => {
        const order = db[String(merchantOrderId).trim()];
        if (!order)
            throw new Error("Không tìm thấy đơn hàng");
        order.checkoutOrderId = String(checkoutOrderId).trim();
        order.updatedAt = new Date().toISOString();
        return order;
    });
}
export async function findOrderByCheckoutOrderId(id) {
    const checkoutOrderId = String(id).trim();
    const db = await readDb();
    const order = Object.values(db).find((entry) => String(entry.checkoutOrderId ?? "").trim() === checkoutOrderId) ?? null;
    return order
        ? { ...order, orderStatus: order.orderStatus ?? "new" }
        : null;
}
export async function findOrderByTransactionId(id) {
    const transactionId = String(id).trim();
    const db = await readDb();
    const order = Object.values(db).find((entry) => String(entry.paymentTransactionId ?? "").trim() === transactionId) ?? null;
    return order
        ? { ...order, orderStatus: order.orderStatus ?? "new" }
        : null;
}
export async function updateCodNotify(input) {
    return mutate((db) => {
        const checkoutOrderId = String(input.checkoutOrderId).trim();
        const order = Object.values(db).find((entry) => String(entry.checkoutOrderId ?? "").trim() === checkoutOrderId);
        if (!order)
            return null;
        order.paymentStatus = "cod_confirmed";
        order.providerMethod = String(input.providerMethod);
        order.paymentMessage = "Đơn COD đã được xác nhận";
        order.updatedAt = new Date().toISOString();
        return order;
    });
}
export async function updateOnlinePayment(input) {
    return mutate((db) => {
        const order = db[String(input.merchantOrderId).trim()];
        if (!order)
            throw new Error("Không tìm thấy đơn hàng");
        order.checkoutOrderId = String(input.checkoutOrderId).trim();
        order.paymentTransactionId = String(input.transId).trim();
        order.providerMethod = input.providerMethod;
        order.paymentMessage = input.message;
        order.paymentStatus = input.success ? "paid" : "failed";
        order.updatedAt = new Date().toISOString();
        return order;
    });
}
