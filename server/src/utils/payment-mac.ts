import crypto from "node:crypto";

export type MacValue = string | number | boolean | null | undefined;
export type MacObject = Record<string, MacValue>;

function hmacSha256(privateKey: string, content: string): string {
  return crypto
    .createHmac("sha256", privateKey)
    .update(content, "utf8")
    .digest("hex");
}

export function buildSortedMacData(data: MacObject): string {
  return Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key] ?? ""}`)
    .join("&");
}

export function createOrderMac(data: MacObject, privateKey: string): string {
  return hmacSha256(privateKey, buildSortedMacData(data));
}

function safeEqualHex(expected: string, received: string): boolean {
  if (!/^[a-f0-9]+$/i.test(expected) || !/^[a-f0-9]+$/i.test(received)) {
    return false;
  }

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");

  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type CallbackData = {
  appId: string;
  orderId: string;
  transId: string;
  method?: string;
  transTime?: string | number;
  merchantTransId?: string;
  amount: number;
  description: string;
  resultCode: number;
  message: string;
  extradata?: string;
  [key: string]: MacValue;
};

export function verifyCallbackMac(
  data: CallbackData,
  receivedMac: string,
  privateKey: string,
): boolean {
  const content = [
    `appId=${data.appId}`,
    `amount=${data.amount}`,
    `description=${data.description}`,
    `orderId=${data.orderId}`,
    `message=${data.message}`,
    `resultCode=${data.resultCode}`,
    `transId=${data.transId}`,
  ].join("&");

  return safeEqualHex(hmacSha256(privateKey, content), receivedMac);
}

export function verifyOverallMac(
  data: CallbackData,
  receivedOverallMac: string,
  privateKey: string,
): boolean {
  return safeEqualHex(
    hmacSha256(privateKey, buildSortedMacData(data)),
    receivedOverallMac,
  );
}

export function verifyNotifyMac(input: {
  appId: string;
  orderId: string;
  method: string;
  receivedMac: string;
  privateKey: string;
}): boolean {
  const content =
    `appId=${input.appId}` +
    `&orderId=${input.orderId}` +
    `&method=${input.method}`;

  return safeEqualHex(
    hmacSha256(input.privateKey, content),
    input.receivedMac,
  );
}
