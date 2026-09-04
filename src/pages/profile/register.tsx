import registerIllusRight from "@/static/register-illus-right.svg";
import CONFIG from "@/config";
import { userInfoKeyState } from "@/state";
import type { UserInfo } from "@/types";
import { useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

function createMemberId() {
  return `member-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function Register() {
  const refreshUserInfo = useSetAtom(userInfoKeyState);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const normalizedPhone = useMemo(
    () => phone.replace(/\s+/g, "").trim(),
    [phone],
  );

  const handleSubmit = () => {
    const customerName = name.trim();

    if (!customerName) {
      toast.error("Vui lòng nhập họ và tên.");
      return;
    }

    if (!normalizedPhone) {
      toast.error("Vui lòng nhập số điện thoại.");
      return;
    }

    if (!/^(0|\+84)[0-9]{9,10}$/.test(normalizedPhone)) {
      toast.error("Số điện thoại không hợp lệ.");
      return;
    }

    if (
      email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      toast.error("Email không hợp lệ.");
      return;
    }

    try {
      setSaving(true);

      const registeredAt = new Date();
      const pointsExpireAt = new Date(registeredAt);
      pointsExpireAt.setFullYear(pointsExpireAt.getFullYear() + 1);

      const member: UserInfo = {
        id: createMemberId(),
        name: customerName,
        avatar: "",
        phone: normalizedPhone,
        email: email.trim(),
        address: address.trim(),
        points: 0,
        registeredAt: registeredAt.toISOString(),
        pointsExpireAt: pointsExpireAt.toISOString(),
      };

      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_INFO,
        JSON.stringify(member),
      );

      refreshUserInfo((key) => key + 1);

      toast.success("Đăng ký thành viên thành công.");
      setShowForm(false);
    } catch (error) {
      console.error("Save member information failed:", error);
      toast.error("Không thể lưu thông tin thành viên. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <button
        type="button"
        className="w-full rounded-lg bg-primary p-4 text-left text-white bg-cover space-y-0.5"
        style={{
          backgroundImage: `url(${registerIllusRight})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom right",
          backgroundSize: "auto",
        }}
        onClick={() => setShowForm(true)}
      >
        <div className="text-lg">Đăng ký thành viên</div>
        <div className="text-2xs">
          Đăng ký thành viên để nhận nhiều ưu đãi
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <div className="mb-4">
        <div className="text-lg font-semibold">
          Đăng ký thành viên
        </div>
        <div className="mt-1 text-xs text-subtitle">
          Vui lòng nhập thông tin để tạo tài khoản thành viên Trung Kim.
        </div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <div className="mb-1 text-sm font-medium">
            Họ và tên <span className="text-red-500">*</span>
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nhập họ và tên"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-primary"
            autoComplete="name"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">
            Số điện thoại <span className="text-red-500">*</span>
          </div>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Ví dụ: 0358518816"
            inputMode="tel"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-primary"
            autoComplete="tel"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">
            Email
          </div>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Nhập email"
            inputMode="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-primary"
            autoComplete="email"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">
            Địa chỉ
          </div>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Nhập địa chỉ nhận hàng"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-primary"
            autoComplete="street-address"
          />
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => setShowForm(false)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Đăng ký"}
          </button>
        </div>
      </div>
    </div>
  );
}
