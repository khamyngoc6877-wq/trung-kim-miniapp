import { Router } from "express";
import { login, profile, register } from "../controllers/member.controller.js";
const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/:id", profile);
export default router;
