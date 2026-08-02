import "dotenv/config";
import express from "express";
import cors from "cors";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();
app.disable("x-powered-by");

const configuredOrigin = process.env.MINI_APP_ORIGIN?.trim();
app.use(cors({
  origin: configuredOrigin && configuredOrigin !== "*" ? configuredOrigin : true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => res.status(200).json({
  status: "ok",
  environment: process.env.PAYMENT_ENVIRONMENT === "production" ? "production" : "sandbox",
}));
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`Payment server running on port ${port}`));
