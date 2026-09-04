import { Router } from "express";
import { login, profile, redeem, register, } from "../controllers/member.controller.js";
const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/:id/redeem", redeem);
router.get("/:id", profile);
export default router;
