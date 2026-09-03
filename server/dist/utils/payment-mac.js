import crypto from "node:crypto";
function hmacSha256(privateKey, value) {
    return crypto
        .createHmac("sha256", privateKey)
        .update(value, "utf8")
        .digest("hex");
}
function timingSafeHexEqual(expected, received) {
    if (!/^[0-9a-f]+$/i.test(expected) ||
        !/^[0-9a-f]+$/i.test(received)) {
        return false;
    }
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    return (a.length > 0 &&
        a.length === b.length &&
        crypto.timingSafeEqual(a, b));
}
/**
 * Tạo MAC cho Payment.createOrder()
 *
 * - Sắp xếp key tăng dần.
 * - Object/array dùng JSON.stringify().
 * - extradata và method đã là JSON string.
 */
export function createOrderMac(input, privateKey) {
    const params = {
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
        return `${key}=${typeof value === "object"
            ? JSON.stringify(value)
            : String(value ?? "")}`;
    })
        .join("&");
    return hmacSha256(privateKey, dataMac);
}
/**
 * Kiểm tra MAC của callback.
 */
export function verifyCallbackMac(data, receivedMac, privateKey) {
    const content = [
        `appId=${data.appId}`,
        `amount=${data.amount}`,
        `description=${data.description}`,
        `orderId=${data.orderId}`,
        `message=${data.message}`,
        `resultCode=${data.resultCode}`,
        `transId=${data.transId}`,
    ].join("&");
    const expectedMac = hmacSha256(privateKey, content);
    return timingSafeHexEqual(expectedMac, receivedMac);
}
/**
 * Kiểm tra overallMac của callback.
 */
export function verifyOverallMac(data, receivedMac, privateKey) {
    const content = Object.keys(data)
        .sort()
        .map((key) => {
        const value = data[key];
        return `${key}=${typeof value === "object"
            ? JSON.stringify(value)
            : String(value ?? "")}`;
    })
        .join("&");
    const expectedMac = hmacSha256(privateKey, content);
    return timingSafeHexEqual(expectedMac, receivedMac);
}
/**
 * Kiểm tra MAC của COD Notify.
 *
 * Backend không bỏ kiểm tra chữ ký.
 *
 * Kiểm tra:
 * 1. mac
 * 2. overallMac nếu Zalo gửi về
 */
export function verifyNotifyMac(input) {
    const { data, receivedMac, receivedOverallMac, privateKey, } = input;
    /*
     * =====================================================
     * NORMAL MAC
     * =====================================================
     */
    const notifyContent = [
        `appId=${String(data.appId ?? "")}`,
        `method=${String(data.method ?? "")}`,
        `orderId=${String(data.orderId ?? "")}`,
        `extradata=${String(data.extradata ?? "")}`,
    ].join("&");
    const expectedMac = hmacSha256(privateKey, notifyContent);
    const normalMacValid = timingSafeHexEqual(expectedMac, receivedMac);
    /*
     * =====================================================
     * OVERALL MAC
     * =====================================================
     */
    let overallMacValid = false;
    if (receivedOverallMac) {
        const overallContent = Object.keys(data)
            .sort()
            .map((key) => {
            const value = data[key];
            return `${key}=${typeof value === "object"
                ? JSON.stringify(value)
                : String(value ?? "")}`;
        })
            .join("&");
        const expectedOverallMac = hmacSha256(privateKey, overallContent);
        overallMacValid =
            timingSafeHexEqual(expectedOverallMac, receivedOverallMac);
        console.log("NOTIFY_OVERALL_MAC_DEBUG:", {
            overallContent,
            overallMacValid,
            // Không log Private Key.
            receivedOverallMacLength: receivedOverallMac.length,
            expectedOverallMacLength: expectedOverallMac.length,
        });
    }
    /*
     * =====================================================
     * DEBUG
     * =====================================================
     */
    console.log("NOTIFY_MAC_DEBUG:", {
        notifyContent,
        normalMacValid,
        overallMacValid,
        appId: data.appId,
        orderId: data.orderId,
        method: data.method,
        hasExtradata: Boolean(data.extradata),
        receivedMacLength: receivedMac?.length ?? 0,
        hasOverallMac: Boolean(receivedOverallMac),
    });
    /*
     * Chỉ chấp nhận khi có ít nhất
     * một chữ ký hợp lệ.
     */
    return (normalMacValid ||
        overallMacValid);
}
