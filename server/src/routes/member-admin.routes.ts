import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { pool } from "../lib/db.js";

const router = Router();

function adminAuthorized(req: Request): boolean {
  const configured = process.env.ADMIN_TOKEN;
  const supplied = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!configured || !supplied) return false;
  const a = Buffer.from(configured, "utf8");
  const b = Buffer.from(supplied, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

router.use((req: Request, res: Response, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!adminAuthorized(req)) {
    res.status(401).json({ message: "Không có quyền truy cập quản trị" });
    return;
  }
  next();
});

router.get("/members", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim().slice(0, 100);
    const limit = 50;
    const page = Math.max(1, Math.min(10000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1));
    const offset = (page - 1) * limit;
    const params = q ? [`%${q}%`] : [];
    const where = q ? "WHERE name ILIKE $1 OR phone ILIKE $1 OR COALESCE(email,'') ILIKE $1" : "";
    const [count, result] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM public.members ${where}`, params),
      pool.query(`SELECT id,name,phone,email,points,registered_at,points_expire_at FROM public.members ${where} ORDER BY registered_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    ]);
    res.json({ total: count.rows[0]?.total ?? 0, page, limit, members: result.rows });
  } catch (err) {
    console.error("Admin member list failed", err);
    res.status(500).json({ message: "Không tải được danh sách thành viên" });
  }
});

router.get("/members/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      res.status(400).json({ message: "Mã thành viên không hợp lệ" });
      return;
    }
    const [member, history, vouchers] = await Promise.all([
      pool.query("SELECT id,name,phone,email,address,points,registered_at,points_expire_at FROM public.members WHERE id=$1", [id]),
      pool.query("SELECT id,type,points,description,order_id,created_at FROM public.point_history WHERE member_id=$1 ORDER BY created_at DESC LIMIT 100", [id]),
      pool.query("SELECT voucher_code,name,discount_amount,points_spent,created_at,end_at FROM public.member_vouchers WHERE member_id=$1 ORDER BY created_at DESC LIMIT 100", [id]),
    ]);
    if (!member.rows[0]) {
      res.status(404).json({ message: "Không tìm thấy thành viên" });
      return;
    }
    res.json({ member: member.rows[0], history: history.rows, vouchers: vouchers.rows });
  } catch (err) {
    console.error("Admin member detail failed", err);
    res.status(500).json({ message: "Không tải được thông tin thành viên" });
  }
});

export default router;
