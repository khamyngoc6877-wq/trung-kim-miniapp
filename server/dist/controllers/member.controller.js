import { getMember, loginMember, registerMember } from "../services/member.service.js";
export async function register(req, res) { try {
    const { name, phone, email, address, password } = req.body ?? {};
    if (!String(name ?? "").trim() || !String(phone ?? "").trim() || String(password ?? "").length < 6) {
        res.status(400).json({ message: "Vui lòng nhập họ tên, số điện thoại và mật khẩu ít nhất 6 ký tự" });
        return;
    }
    res.status(201).json(await registerMember({ name: String(name), phone: String(phone), email: String(email ?? ""), address: String(address ?? ""), password: String(password) }));
}
catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : "Không thể đăng ký" });
} }
export async function login(req, res) { const m = await loginMember(String(req.body?.phone ?? ""), String(req.body?.password ?? "")); if (!m) {
    res.status(401).json({ message: "Số điện thoại hoặc mật khẩu không đúng" });
    return;
} res.json(m); }
export async function profile(req, res) { const m = await getMember(String(req.params.id ?? "")); if (!m) {
    res.status(404).json({ message: "Không tìm thấy thành viên" });
    return;
} res.json(m); }
