import { createOrderMac } from "../utils/payment-mac.js";
function resolveMethodId(paymentMethod, environment) {
    if (paymentMethod === "cash")
        return environment === "production" ? "COD" : "COD_SANDBOX";
    return environment === "production" ? "ZALOPAY" : "ZALOPAY_SANDBOX";
}
export function preparePaymentData(order, environment) {
    const privateKey = process.env.PAYMENT_PRIVATE_KEY?.trim();
    if (!privateKey)
        throw new Error("Thiếu PAYMENT_PRIVATE_KEY trên backend");
    const desc = order.paymentMethod === "cash" ? `Đơn COD ${order.code}` : `Thanh toán đơn ${order.code}`;
    const extradata = JSON.stringify({
        merchantOrderId: order.id,
        merchantOrderCode: order.code,
        paymentMethod: order.paymentMethod,
    });
    const method = JSON.stringify({
        id: resolveMethodId(order.paymentMethod, environment),
        isCustom: false,
    });
    const paymentItems = order.items.map((item) => ({
        id: String(item.id),
        amount: Number(item.amount),
    }));
    const mac = createOrderMac({ amount: order.totalAmount, desc, item: paymentItems, extradata, method }, privateKey);
    // item phải là Array khi gọi createOrder; chỉ JSON.stringify trong quá trình tạo MAC.
    return { amount: order.totalAmount, desc, item: paymentItems, extradata, method, mac };
}
