import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import productRoutes from "./routes/product.routes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable("x-powered-by");
const configuredOrigin = process.env.MINI_APP_ORIGIN?.trim();
app.use(cors({
    origin: configuredOrigin &&
        configuredOrigin !== "*"
        ? configuredOrigin
        : true,
    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
    ],
}));
app.use(express.json({
    limit: "2mb",
}));
/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (_req, res) => res.status(200).json({
    status: "ok",
    environment: process.env.PAYMENT_ENVIRONMENT ===
        "production"
        ? "production"
        : "sandbox",
}));
/* =========================
   ORDER API
========================= */
app.use("/api/orders", orderRoutes);
/* =========================
   PAYMENT API
========================= */
app.use("/api/payments", paymentRoutes);
/* =========================
   PRODUCT API
========================= */
app.use("/api/products", productRoutes);
/* =========================
   ADMIN PRODUCT MANAGEMENT
========================= */
const adminDirectory = path.resolve(__dirname, "../public/admin");
app.use("/admin", express.static(adminDirectory));
/* =========================
   404
   PHẢI ĐỂ CUỐI CÙNG
========================= */
app.use((_req, res) => res.status(404).json({
    message: "Route not found",
}));
/* =========================
   START SERVER
========================= */
const port = Number(process.env.PORT) ||
    3000;
app.listen(port, "0.0.0.0", () => console.log(`Payment server running on port ${port}`));
