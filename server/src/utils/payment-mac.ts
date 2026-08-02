import crypto from "node:crypto";

export type CreateOrderMacInput = {
  amount: number;
  desc: string;
  item: unknown[];
  extradata: string;
  method: string;
};

function hmacSha256(privateKey: string, value: string): string {
  return crypto.createHmac("sha256", privateKey).update(value, "utf8").digest("hex");
}

function timingSafeHexEqual(expected: string, received: string): boolean {
  if (!/^[0-9a-f]+$/i.test(expected) || !/^[0-9a-f]+$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Theo tài liệu createOrder:
 * - sắp xếp key tăng dần
 * - object/array phải JSON.stringify khi tạo chuỗi MAC
 * - extradata và method vốn đã là JSON string
 */
export function createOrderMac(input: CreateOrderMacInput, privateKey: string): string {
  const params: Record<string, unknown> = {
    amount: input.amount,
    desc: input.desc,
    extradata: input.extradata,
    item: input.item,
    method: input.method,
  };

  const dataMac = Object.keys(params)
    .sort()
    .map((key) => {
      const value = params[key];
      return `${key}=${typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}`;
    })
    .join("&");

  return hmacSha256(privateKey, dataMac);
}

export type CallbackData = {
  appId: string;
  orderId: string;
  transId: string;
  amount: number;
  description: string;
  resultCode: number;
  message: string;
  method?: string;
  extradata?: string;
  transTime?: string | number;
  merchantTransId?: string;
  [key: string]: unknown;
};

export function verifyCallbackMac(data: CallbackData, receivedMac: string, privateKey: string): boolean {
  const content = [
    `appId=${data.appId}`,
    `amount=${data.amount}`,
    `description=${data.description}`,
    `orderId=${data.orderId}`,
    `message=${data.message}`,
    `resultCode=${data.resultCode}`,
    `transId=${data.transId}`,
  ].join("&");
  return timingSafeHexEqual(hmacSha256(privateKey, content), receivedMac);
}

export function verifyOverallMac(data: CallbackData, receivedMac: string, privateKey: string): boolean {
  const content = Object.keys(data)
    .sort()
    .map((key) => {
      const value = data[key];
      return `${key}=${typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}`;
    })
    .join("&");
  return timingSafeHexEqual(hmacSha256(privateKey, content), receivedMac);
}

export function verifyNotifyMac(input: {
  appId: string;
  orderId: string;
  method: string;
  receivedMac: string;
  privateKey: string;
}): boolean {
  const content = `appId=${input.appId}&method=${input.method}&orderId=${input.orderId}`;
  return timingSafeHexEqual(hmacSha256(input.privateKey, content), input.receivedMac);
}
