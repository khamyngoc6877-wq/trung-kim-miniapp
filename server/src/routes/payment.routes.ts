import { Router } from "express";
import { bindCheckout, createSignature, paymentCallback, paymentNotify } from "../controllers/payment.controller.js";
import { createZaloPayPayment, zaloPayCallback } from "../controllers/zalopay.controller.js";

const router = Router();
router.post("/create-signature", createSignature);
router.post("/bind-checkout-order", bindCheckout);
router.post("/callback", paymentCallback);
router.post("/notify", paymentNotify);
router.post("/zalopay/create", createZaloPayPayment);
router.post("/zalopay/callback", zaloPayCallback);
export default router;
