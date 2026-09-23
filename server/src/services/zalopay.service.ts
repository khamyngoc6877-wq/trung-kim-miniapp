import crypto from "node:crypto";
import type { StoreOrder } from "./order.service.js";

const SANDBOX_CREATE_URL = "https://sb-openapi.zalopay.vn/v2/create";
const PRODUCTION_CREATE_URL = "https://openapi.zalopay.vn/v2/create";

function hmacSha256(key: string, data: string): string {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}

function vietnamDatePrefix(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

function safeOrderSuffix(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_-]/g, "").slice(-28);
  return cleaned || Date.now().toString();
}

export type ZaloPayCreateResult = {
  appTransId: string;
  returnCode: number;
  returnMessage?: string;
  subReturnCode?: number;
  subReturnMessage?: string;
  orderUrl?: string;
  zpTransToken?: string;
  orderToken?: string;
  qrCode?: string;
};

export async function createZaloPayOrder(order: StoreOrder): Promise<ZaloPayCreateResult> {
  const appId = Number(process.env.ZALOPAY_APP_ID);
  const macKey = process.env.ZALOPAY_MAC_KEY?.trim();
  const callbackUrl = process.env.ZALOPAY_CALLBACK_URL?.trim();
  const environment = process.env.PAYMENT_ENVIRONMENT === "production" ? "production" : "sandbox";

  if (!Number.isInteger(appId) || appId <= 0) throw new Error("Thiếu hoặc sai ZALOPAY_APP_ID");
  if (!macKey) throw new Error("Thiếu ZALOPAY_MAC_KEY");
  if (!callbackUrl) throw new Error("Thiếu ZALOPAY_CALLBACK_URL");
  if (order.paymentMethod !== "zalopay") throw new Error("Đơn hàng không sử dụng ZaloPay");

  const appTime = Date.now();

  // Mỗi lần tạo giao dịch ZaloPay phải có app_trans_id duy nhất.
  // Thêm thời gian + chuỗi ngẫu nhiên để có thể thanh toán lại cùng một đơn.
  const retryToken = `${appTime.toString(36)}${crypto.randomBytes(3).toString("hex")}`;
  const orderSuffix = safeOrderSuffix(order.id).slice(-16);
  const appTransId = `${vietnamDatePrefix()}_${orderSuffix}_${retryToken}`.slice(0, 40);

  const appUser = String(order.memberPhone || order.memberId || "trung-kim-customer").slice(0, 50);
  const amount = Math.round(Number(order.totalAmount));
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Số tiền ZaloPay không hợp lệ");

  const item = JSON.stringify(order.items.map((x) => ({
    itemid: String(x.id),
    itemname: String(x.name).slice(0, 200),
    itemprice: Math.round(Number(x.amount)),
    itemquantity: Number(x.quantity),
  })));

  const embedData = JSON.stringify({
    merchantOrderId: order.id,
    merchantOrderCode: order.code,
  });

  const macInput = [appId, appTransId, appUser, amount, appTime, embedData, item].join("|");
  const mac = hmacSha256(macKey, macInput);

  const body = {
    app_id: appId,
    app_user: appUser,
    app_trans_id: appTransId,
    app_time: appTime,
    amount,
    description: `Thanh toan don ${order.code}`.slice(0, 256),
    callback_url: callbackUrl,
    item,
    embed_data: embedData,
    bank_code: "",
    mac,
  };

  const endpoint = environment === "production" ? PRODUCTION_CREATE_URL : SANDBOX_CREATE_URL;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const result = (await response.json().catch(() => null)) as any;
  if (!response.ok || !result) throw new Error(`ZaloPay create order HTTP ${response.status}`);

  const output: ZaloPayCreateResult = {
    appTransId,
    returnCode: Number(result.return_code ?? 0),
    returnMessage: result.return_message,
    subReturnCode: Number(result.sub_return_code ?? 0),
    subReturnMessage: result.sub_return_message,
    orderUrl: result.order_url,
    zpTransToken: result.zp_trans_token,
    orderToken: result.order_token,
    qrCode: result.qr_code,
  };

  if (output.returnCode !== 1 || !output.orderUrl) {
    throw new Error(output.subReturnMessage || output.returnMessage || "ZaloPay không tạo được đơn thanh toán");
  }
  return output;
}

export function verifyZaloPayCallback(data: string, receivedMac: string): boolean {
  const callbackKey = process.env.ZALOPAY_CALLBACK_KEY?.trim();
  if (!callbackKey || !data || !receivedMac) return false;
  const expected = hmacSha256(callbackKey, data);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(receivedMac, "hex");
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
