import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createVoucher } from "./voucher.service.js";
const filePath = path.resolve(process.env.MEMBER_STORE_FILE || "./data/members.json");
let queue = Promise.resolve();
async function readDb() {
    try {
        const content = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(content || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch (error) {
        if (error.code === "ENOENT")
            return {};
        throw error;
    }
}
async function writeDb(db) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.tmp`;
    await fs.writeFile(temp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(temp, filePath);
}
function mutate(fn) {
    const next = queue.then(async () => {
        const db = await readDb();
        const result = await fn(db);
        await writeDb(db);
        return result;
    });
    queue = next.catch(() => undefined);
    return next;
}
function hash(password) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}
function ensureLegacyHistory(member) {
    member.rewardedOrderIds ??= [];
    member.vouchers ??= [];
    member.pointHistory ??= [];
    // Các điểm có từ trước khi chức năng "Lịch sử điểm" được thêm
    // sẽ được hiển thị thành một số dư đầu kỳ, thay vì bị mất lịch sử hoàn toàn.
    if (member.points > 0 &&
        member.pointHistory.length === 0) {
        member.pointHistory.push({
            id: crypto.randomUUID(),
            type: "opening",
            points: member.points,
            description: "Số dư điểm trước khi bật lịch sử điểm",
            createdAt: member.registeredAt ||
                new Date().toISOString(),
        });
    }
}
function safe(member) {
    ensureLegacyHistory(member);
    const { passwordHash, rewardedOrderIds, ...result } = member;
    return {
        ...result,
        pointHistory: member.pointHistory ?? [],
        vouchers: member.vouchers ?? [],
    };
}
export async function registerMember(input) {
    return mutate((db) => {
        const phone = input.phone
            .replace(/\s+/g, "")
            .trim();
        if (Object.values(db).some((member) => member.phone === phone)) {
            throw new Error("Số điện thoại đã đăng ký");
        }
        const now = new Date();
        const expireAt = new Date(now);
        expireAt.setFullYear(expireAt.getFullYear() + 1);
        const member = {
            id: crypto.randomUUID(),
            name: input.name.trim(),
            phone,
            email: input.email?.trim(),
            address: input.address?.trim(),
            passwordHash: hash(input.password),
            points: 0,
            registeredAt: now.toISOString(),
            pointsExpireAt: expireAt.toISOString(),
            rewardedOrderIds: [],
            pointHistory: [],
            vouchers: [],
        };
        db[member.id] = member;
        return safe(member);
    });
}
export async function loginMember(phone, password) {
    const db = await readDb();
    const normalizedPhone = phone
        .replace(/\s+/g, "")
        .trim();
    const member = Object.values(db).find((item) => item.phone === normalizedPhone &&
        item.passwordHash === hash(password));
    return member ? safe(member) : null;
}
export async function getMember(id) {
    // Dùng mutate để migration lịch sử cũ cũng được ghi lại xuống file.
    return mutate((db) => {
        const member = db[String(id).trim()];
        if (!member)
            return null;
        ensureLegacyHistory(member);
        return safe(member);
    });
}
export async function addOrderPoints(memberId, orderId, subtotal) {
    return mutate((db) => {
        const member = db[memberId];
        if (!member)
            return null;
        ensureLegacyHistory(member);
        if (member.rewardedOrderIds.includes(orderId)) {
            return {
                ...safe(member),
                earnedPoints: 0,
            };
        }
        const earnedPoints = Math.floor(Math.max(0, subtotal) / 10000);
        member.rewardedOrderIds.push(orderId);
        if (earnedPoints > 0) {
            member.points += earnedPoints;
            member.pointHistory.unshift({
                id: crypto.randomUUID(),
                type: "earn",
                points: earnedPoints,
                description: `Cộng điểm đơn hàng ${orderId}`,
                orderId,
                createdAt: new Date().toISOString(),
            });
        }
        return {
            ...safe(member),
            earnedPoints,
        };
    });
}
const REDEEM_POINTS = 100;
const REDEEM_VALUE = 20000;
export async function redeemMemberPoints(memberId) {
    const memberKey = String(memberId).trim();
    const prepared = await mutate((db) => {
        const member = db[memberKey];
        if (!member) {
            throw new Error("Không tìm thấy tài khoản thành viên");
        }
        ensureLegacyHistory(member);
        if (member.points < REDEEM_POINTS) {
            throw new Error(`Bạn đang có ${member.points} điểm. Cần đủ ${REDEEM_POINTS} điểm để đổi voucher.`);
        }
        const now = new Date();
        const endAt = new Date(now);
        endAt.setMonth(endAt.getMonth() + 3);
        const code = `TKD${crypto
            .randomBytes(5)
            .toString("hex")
            .toUpperCase()}`;
        const voucher = {
            code,
            name: "Voucher đổi từ 100 điểm",
            discountAmount: REDEEM_VALUE,
            pointsSpent: REDEEM_POINTS,
            createdAt: now.toISOString(),
            endAt: endAt.toISOString(),
        };
        member.points -= REDEEM_POINTS;
        member.vouchers.unshift(voucher);
        member.pointHistory.unshift({
            id: crypto.randomUUID(),
            type: "redeem",
            points: -REDEEM_POINTS,
            description: "Đổi 100 điểm lấy voucher 20.000đ",
            voucherCode: code,
            createdAt: now.toISOString(),
        });
        return {
            member: safe(member),
            voucher,
        };
    });
    try {
        await createVoucher({
            code: prepared.voucher.code,
            name: prepared.voucher.name,
            type: "fixed",
            value: REDEEM_VALUE,
            minOrder: REDEEM_VALUE,
            usageLimit: 1,
            startAt: prepared.voucher.createdAt,
            endAt: prepared.voucher.endAt,
            active: true,
        });
    }
    catch (error) {
        // Rollback điểm + voucher + history nếu tạo voucher thất bại.
        await mutate((db) => {
            const member = db[memberKey];
            if (!member)
                return;
            ensureLegacyHistory(member);
            member.points += REDEEM_POINTS;
            member.vouchers = member.vouchers.filter((item) => item.code !== prepared.voucher.code);
            member.pointHistory =
                member.pointHistory.filter((item) => item.voucherCode !==
                    prepared.voucher.code);
        });
        console.error("Create redeemed voucher failed:", error);
        throw new Error("Không tạo được voucher. Điểm của bạn đã được hoàn lại, vui lòng thử lại.");
    }
    const freshMember = await getMember(memberKey);
    return {
        ...freshMember,
        redeemedVoucher: prepared.voucher,
    };
}
