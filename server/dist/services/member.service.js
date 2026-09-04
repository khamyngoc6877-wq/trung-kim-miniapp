import crypto from "node:crypto";
import { pool } from "../lib/db.js";
function hash(password) {
    return crypto.createHash("sha256").update(password).digest("hex");
}
async function buildSafeMember(client, row) {
    const [historyResult, vouchersResult] = await Promise.all([
        client.query(`select id,type,points,description,order_id,created_at
       from public.point_history where member_id=$1 order by created_at desc limit 100`, [row.id]),
        client.query(`select voucher_code,name,discount_amount,points_spent,created_at,end_at
       from public.member_vouchers where member_id=$1 order by created_at desc`, [row.id]),
    ]);
    return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        address: row.address || undefined,
        points: Number(row.points),
        registeredAt: new Date(row.registered_at).toISOString(),
        pointsExpireAt: row.points_expire_at ? new Date(row.points_expire_at).toISOString() : "",
        pointHistory: historyResult.rows.map((h) => ({
            id: h.id,
            type: h.type,
            points: Number(h.points),
            description: h.description,
            orderId: h.order_id || undefined,
            createdAt: new Date(h.created_at).toISOString(),
        })),
        vouchers: vouchersResult.rows.map((v) => ({
            code: v.voucher_code,
            name: v.name,
            discountAmount: Number(v.discount_amount),
            pointsSpent: Number(v.points_spent),
            createdAt: new Date(v.created_at).toISOString(),
            endAt: v.end_at ? new Date(v.end_at).toISOString() : "",
        })),
    };
}
export async function registerMember(input) {
    const phone = input.phone.replace(/\s+/g, "").trim();
    const now = new Date();
    const expireAt = new Date(now);
    expireAt.setFullYear(expireAt.getFullYear() + 1);
    const id = crypto.randomUUID();
    try {
        const { rows } = await pool.query(`insert into public.members
       (id,name,phone,email,address,password_hash,points,registered_at,points_expire_at,created_at,updated_at)
       values ($1,$2,$3,$4,$5,$6,0,$7,$8,$7,$7) returning *`, [id, input.name.trim(), phone, input.email?.trim() || null, input.address?.trim() || null,
            hash(input.password), now.toISOString(), expireAt.toISOString()]);
        return buildSafeMember(pool, rows[0]);
    }
    catch (e) {
        if (e?.code === "23505")
            throw new Error("Số điện thoại đã đăng ký");
        throw e;
    }
}
export async function loginMember(phone, password) {
    const normalizedPhone = phone.replace(/\s+/g, "").trim();
    const { rows } = await pool.query("select * from public.members where phone=$1 and password_hash=$2 limit 1", [normalizedPhone, hash(password)]);
    return rows[0] ? buildSafeMember(pool, rows[0]) : null;
}
export async function getMember(id) {
    const { rows } = await pool.query("select * from public.members where id=$1 limit 1", [String(id).trim()]);
    return rows[0] ? buildSafeMember(pool, rows[0]) : null;
}
export async function addOrderPoints(memberId, orderId, subtotal) {
    const client = await pool.connect();
    try {
        await client.query("begin");
        const memberResult = await client.query("select * from public.members where id=$1 for update", [memberId]);
        const member = memberResult.rows[0];
        if (!member) {
            await client.query("rollback");
            return null;
        }
        const rewarded = await client.query(`insert into public.rewarded_orders(member_id,order_id) values($1,$2)
       on conflict do nothing returning order_id`, [memberId, orderId]);
        if (!rewarded.rows[0]) {
            await client.query("commit");
            const safe = await buildSafeMember(pool, member);
            return { ...safe, earnedPoints: 0 };
        }
        const earnedPoints = Math.floor(Math.max(0, subtotal) / 10000);
        if (earnedPoints > 0) {
            await client.query("update public.members set points=points+$2,updated_at=now() where id=$1", [memberId, earnedPoints]);
            await client.query(`insert into public.point_history(id,member_id,type,points,description,order_id,created_at)
         values($1,$2,'earn',$3,$4,$5,now())`, [crypto.randomUUID(), memberId, earnedPoints, `Cộng điểm đơn hàng ${orderId}`, orderId]);
        }
        await client.query("commit");
        const fresh = await getMember(memberId);
        return { ...fresh, earnedPoints };
    }
    catch (e) {
        await client.query("rollback");
        throw e;
    }
    finally {
        client.release();
    }
}
const REDEEM_POINTS = 100;
const REDEEM_VALUE = 20000;
export async function redeemMemberPoints(memberId) {
    const client = await pool.connect();
    try {
        await client.query("begin");
        const { rows } = await client.query("select * from public.members where id=$1 for update", [String(memberId).trim()]);
        const member = rows[0];
        if (!member)
            throw new Error("Không tìm thấy tài khoản thành viên");
        if (Number(member.points) < REDEEM_POINTS) {
            throw new Error(`Bạn đang có ${member.points} điểm. Cần đủ ${REDEEM_POINTS} điểm để đổi voucher.`);
        }
        const now = new Date();
        const endAt = new Date(now);
        endAt.setMonth(endAt.getMonth() + 3);
        const code = `TKD${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
        const voucherId = crypto.randomUUID();
        await client.query(`insert into public.vouchers
       (id,code,name,type,value,min_order,usage_limit,used_count,start_at,end_at,active,created_at,updated_at)
       values($1,$2,$3,'fixed',$4,$4,1,0,$5,$6,true,$5,$5)`, [voucherId, code, "Voucher đổi từ 100 điểm", REDEEM_VALUE, now.toISOString(), endAt.toISOString()]);
        await client.query("update public.members set points=points-$2,updated_at=now() where id=$1", [member.id, REDEEM_POINTS]);
        await client.query(`insert into public.member_vouchers
       (id,member_id,voucher_code,name,discount_amount,points_spent,created_at,end_at)
       values($1,$2,$3,$4,$5,$6,$7,$8)`, [crypto.randomUUID(), member.id, code, "Voucher đổi từ 100 điểm", REDEEM_VALUE, REDEEM_POINTS, now.toISOString(), endAt.toISOString()]);
        await client.query(`insert into public.point_history(id,member_id,type,points,description,created_at)
       values($1,$2,'redeem',$3,$4,$5)`, [crypto.randomUUID(), member.id, -REDEEM_POINTS, "Đổi 100 điểm lấy voucher 20.000đ", now.toISOString()]);
        await client.query("commit");
        const fresh = await getMember(member.id);
        return {
            ...fresh,
            redeemedVoucher: {
                code, name: "Voucher đổi từ 100 điểm", discountAmount: REDEEM_VALUE,
                pointsSpent: REDEEM_POINTS, createdAt: now.toISOString(), endAt: endAt.toISOString(),
            },
        };
    }
    catch (e) {
        await client.query("rollback");
        throw e;
    }
    finally {
        client.release();
    }
}
