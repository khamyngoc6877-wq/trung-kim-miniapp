import Barcode from "./barcode";
import barcodeIllusLeft from "@/static/barcode-illus-left.svg";
import barcodeIllusRight from "@/static/barcode-illus-right.svg";
import {
  loadableUserInfoState,
  userInfoKeyState,
} from "@/state";
import {
  redeemPoints,
  refreshMember,
} from "@/services/member.service";
import {
  useAtomValue,
  useSetAtom,
} from "jotai";
import { useState } from "react";
import toast from "react-hot-toast";

function formatDate(value?: string) {
  if (!value) return "--/--/----";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--/--/----";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

type PointHistoryItem = {
  id: string;
  type: "earn" | "redeem" | "opening";
  points: number;
  description: string;
  createdAt: string;
};

type MemberVoucher = {
  code: string;
  name: string;
  discountAmount: number;
  pointsSpent: number;
  createdAt: string;
  endAt: string;
};

type ExtraMember = {
  id?: string;
  points?: number;
  registeredAt?: string;
  pointsExpireAt?: string;
  pointHistory?: PointHistoryItem[];
  vouchers?: MemberVoucher[];
};

export default function Points() {
  const userInfo = useAtomValue(
    loadableUserInfoState,
  );

  const refreshUserInfo = useSetAtom(
    userInfoKeyState,
  );

  const [redeeming, setRedeeming] =
    useState(false);

  const member =
    userInfo.state === "hasData"
      ? (userInfo.data as
          | (typeof userInfo.data &
              ExtraMember)
          | undefined)
      : undefined;

  const points = Math.max(
    0,
    Number(member?.points ?? 0),
  );

  const missingPoints = Math.max(
    0,
    100 - points,
  );

  async function syncMember() {
    await refreshMember();
    refreshUserInfo((key) => key + 1);
  }

  async function handleRedeem() {
    if (!member?.id || redeeming) return;

    if (points < 100) {
      toast.error(
        `Bạn còn thiếu ${missingPoints} điểm để đổi voucher.`,
      );
      return;
    }

    try {
      setRedeeming(true);

      const result = await redeemPoints(
        member.id,
      );

      await syncMember();

      toast.success(
        `Đổi điểm thành công. Mã voucher: ${
          result?.redeemedVoucher?.code ??
          "đã tạo"
        }`,
        {
          duration: 7000,
        },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể đổi điểm",
      );
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div
        className="rounded-lg bg-primary text-white p-8 pt-6 bg-cover text-center"
        style={{
          backgroundImage: `url(${barcodeIllusLeft}), url(${barcodeIllusRight})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition:
            "top left, bottom right",
          backgroundSize: "auto, auto",
        }}
      >
        <div className="text-xl font-medium opacity-95">
          {points.toLocaleString("vi-VN")} điểm
        </div>

        <div className="opacity-95 text-2xs">
          Ngày đăng ký:{" "}
          {formatDate(member?.registeredAt)}
        </div>

        <div className="opacity-95 text-2xs">
          Điểm có hiệu lực đến:{" "}
          {formatDate(
            member?.pointsExpireAt,
          )}
        </div>

        <div className="mt-3 rounded-lg bg-white/15 p-3 text-sm">
          <div>10.000đ = 1 điểm</div>
          <div>
            100 điểm = voucher 20.000đ
          </div>

          <button
            type="button"
            disabled={redeeming}
            onClick={handleRedeem}
            className="mt-2 w-full rounded-lg bg-white px-4 py-2 font-medium text-primary disabled:opacity-50"
          >
            {redeeming
              ? "Đang đổi điểm..."
              : points >= 100
                ? "Đổi 100 điểm lấy voucher 20.000đ"
                : `Cần thêm ${missingPoints} điểm`}
          </button>
        </div>

        <div className="bg-white rounded-lg mt-2 py-2.5 space-y-2.5 flex flex-col items-center">
          <div className="text-2xs text-subtitle text-center">
            Mã thành viên
          </div>
          <Barcode />
        </div>
      </div>

      <div className="rounded-lg bg-section p-4 border-[0.5px] border-black/10">
        <div className="font-medium mb-2">
          Voucher của tôi
        </div>

        {member?.vouchers?.length ? (
          member.vouchers.map((voucher) => (
            <div
              key={voucher.code}
              className="border-t border-black/10 py-2 first:border-t-0"
            >
              <div className="font-medium text-primary">
                {voucher.code}
              </div>
              <div className="text-sm">
                Giảm{" "}
                {voucher.discountAmount.toLocaleString(
                  "vi-VN",
                )}
                đ
              </div>
              <div className="text-xs text-subtitle">
                Hạn dùng:{" "}
                {formatDate(voucher.endAt)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-subtitle">
            Chưa có voucher đổi từ điểm.
          </div>
        )}
      </div>

      <div className="rounded-lg bg-section p-4 border-[0.5px] border-black/10">
        <div className="font-medium mb-2">
          Lịch sử điểm
        </div>

        {member?.pointHistory?.length ? (
          member.pointHistory
            .slice(0, 30)
            .map((history) => (
              <div
                key={history.id}
                className="flex justify-between gap-3 border-t border-black/10 py-2 first:border-t-0"
              >
                <div>
                  <div className="text-sm">
                    {history.description}
                  </div>
                  <div className="text-xs text-subtitle">
                    {formatDate(
                      history.createdAt,
                    )}
                  </div>
                </div>

                <div
                  className={
                    history.points >= 0
                      ? "font-medium text-primary"
                      : "font-medium text-red-500"
                  }
                >
                  {history.points >= 0
                    ? "+"
                    : ""}
                  {history.points}
                </div>
              </div>
            ))
        ) : (
          <div className="text-sm text-subtitle">
            Chưa có giao dịch điểm.
          </div>
        )}
      </div>
    </div>
  );
}
