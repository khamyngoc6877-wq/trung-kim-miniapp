import crypto from "node:crypto";
import { findOrderById, listOrders, saveOrder, updateOrderStatus, } from "../services/order.service.js";
export async function createOrder(req, res) {
    try {
        const body = req.body;
        const subtotal = Number(body.subtotal);
        const shippingFee = Number(body.shippingFee);
        const totalAmount = Number(body.totalAmount);
        if (!Number.isFinite(subtotal) || subtotal < 0) {
            res.status(400).json({ message: "Tiền sản phẩm không hợp lệ" });
            return;
        }
        if (!Number.isFinite(shippingFee) || shippingFee < 0) {
            res.status(400).json({ message: "Phí vận chuyển không hợp lệ" });
            return;
        }
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            res.status(400).json({ message: "Tổng tiền không hợp lệ" });
            return;
        }
        if (Math.abs(subtotal + shippingFee - totalAmount) > 0.001) {
            res.status(400).json({ message: "Tổng thanh toán không khớp" });
            return;
        }
        if (body.paymentMethod !== "cash" && body.paymentMethod !== "zalopay") {
            res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
            return;
        }
        if (body.shippingMethod !== "delivery" && body.shippingMethod !== "pickup") {
            res.status(400).json({ message: "Hình thức nhận hàng không hợp lệ" });
            return;
        }
        if (!Array.isArray(body.items) || body.items.length === 0) {
            res.status(400).json({ message: "Đơn hàng chưa có sản phẩm" });
            return;
        }
        const items = body.items.map((item) => ({
            id: String(item.id),
            name: String(item.name || "Sản phẩm"),
            quantity: Number(item.quantity),
            amount: Number(item.amount),
        }));
        if (items.some((item) => !Number.isFinite(item.quantity) ||
            item.quantity <= 0 ||
            !Number.isFinite(item.amount) ||
            item.amount <= 0)) {
            res.status(400).json({ message: "Dữ liệu sản phẩm không hợp lệ" });
            return;
        }
        const id = crypto.randomUUID();
        const code = `TK-${Date.now()}`;
        const now = new Date().toISOString();
        await saveOrder({
            id,
            code,
            subtotal,
            shippingFee,
            totalAmount,
            shippingMethod: body.shippingMethod,
            shippingArea: body.shippingArea,
            shippingAddress: body.shippingAddress,
            items,
            paymentMethod: body.paymentMethod,
            paymentStatus: "pending",
            orderStatus: "new",
            createdAt: now,
            updatedAt: now,
        });
        res.status(201).json({ orderId: id, orderCode: code });
    }
    catch (error) {
        console.error("Create order error", error);
        res.status(500).json({
            message: error instanceof Error ? error.message : "Không thể tạo đơn hàng",
        });
    }
}
export async function getOrder(req, res) {
    try {
        const orderId = String(req.params.orderId ?? "").trim();
        if (!orderId) {
            res.status(400).json({ message: "orderId không hợp lệ" });
            return;
        }
        const order = await findOrderById(orderId);
        if (!order) {
            res.status(404).json({ message: "Không tìm thấy đơn hàng" });
            return;
        }
        res.status(200).json(order);
    }
    catch (error) {
        console.error("Get order error", error);
        res.status(500).json({
            message: error instanceof Error ? error.message : "Không thể lấy đơn hàng",
        });
    }
}
export async function adminListOrders(_req, res) {
    try {
        res.status(200).json(await listOrders());
    }
    catch (error) {
        console.error("Admin list orders error", error);
        res.status(500).json({
            message: error instanceof Error
                ? error.message
                : "Không thể lấy danh sách đơn hàng",
        });
    }
}
export async function adminUpdateOrderStatus(req, res) {
    try {
        const orderId = String(req.params.orderId ?? "").trim();
        const status = String(req.body?.status ?? "").trim();
        const allowed = [
            "new",
            "confirmed",
            "shipping",
            "completed",
            "cancelled",
        ];
        if (!orderId) {
            res.status(400).json({ message: "orderId không hợp lệ" });
            return;
        }
        if (!allowed.includes(status)) {
            res.status(400).json({ message: "Trạng thái đơn hàng không hợp lệ" });
            return;
        }
        const order = await updateOrderStatus(orderId, status);
        if (!order) {
            res.status(404).json({ message: "Không tìm thấy đơn hàng" });
            return;
        }
        res.status(200).json(order);
    }
    catch (error) {
        console.error("Admin update order status error", error);
        res.status(500).json({
            message: error instanceof Error
                ? error.message
                : "Không thể cập nhật trạng thái đơn hàng",
        });
    }
}
