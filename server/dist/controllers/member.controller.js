import { getMember, loginMember, redeemMemberPoints, registerMember, } from "../services/member.service.js";
export async function register(req, res) {
    try {
        const { name, phone, email, address, password, } = req.body ?? {};
        if (!String(name ?? "").trim() ||
            !String(phone ?? "").trim() ||
            String(password ?? "").length < 6) {
            res.status(400).json({
                message: "Vui lòng nhập họ tên, số điện thoại và mật khẩu ít nhất 6 ký tự",
            });
            return;
        }
        res.status(201).json(await registerMember({
            name: String(name),
            phone: String(phone),
            email: String(email ?? ""),
            address: String(address ?? ""),
            password: String(password),
        }));
    }
    catch (error) {
        res.status(400).json({
            message: error instanceof Error
                ? error.message
                : "Không thể đăng ký",
        });
    }
}
export async function login(req, res) {
    const member = await loginMember(String(req.body?.phone ?? ""), String(req.body?.password ?? ""));
    if (!member) {
        res.status(401).json({
            message: "Số điện thoại hoặc mật khẩu không đúng",
        });
        return;
    }
    res.status(200).json(member);
}
export async function profile(req, res) {
    const member = await getMember(String(req.params.id ?? ""));
    if (!member) {
        res.status(404).json({
            message: "Không tìm thấy thành viên",
        });
        return;
    }
    res.status(200).json(member);
}
export async function redeem(req, res) {
    try {
        const memberId = String(req.params.id ?? "").trim();
        if (!memberId) {
            res.status(400).json({
                message: "Mã thành viên không hợp lệ",
            });
            return;
        }
        res.status(200).json(await redeemMemberPoints(memberId));
    }
    catch (error) {
        res.status(400).json({
            message: error instanceof Error
                ? error.message
                : "Không thể đổi điểm",
        });
    }
}
