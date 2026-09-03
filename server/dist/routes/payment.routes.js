import { Router } from "express";
import { bindCheckout, createSignature, paymentCallback, paymentNotify } from "../controllers/payment.controller.js";
const router = Router();
router.post("/create-signature", createSignature);
router.post("/bind-checkout-order", bindCheckout);
router.post("/callback", paymentCallback);
router.post("/notify", paymentNotify);
export default router;
