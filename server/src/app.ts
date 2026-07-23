import "dotenv/config";
import cors from "cors";
import express from "express";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.MINI_APP_ORIGIN || true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.PAYMENT_ENVIRONMENT ?? "sandbox",
  });
});

app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Payment server running on port ${port}`));
