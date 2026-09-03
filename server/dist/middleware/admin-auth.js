export function requireAdmin(req, res, next) {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) {
        res.status(503).json({ message: "ADMIN_TOKEN chưa được cấu hình" });
        return;
    }
    const auth = req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.header("x-admin-token") || "";
    if (token !== expected) {
        res.status(401).json({ message: "Không có quyền quản trị" });
        return;
    }
    next();
}
