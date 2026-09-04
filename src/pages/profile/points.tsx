import Barcode from "./barcode";
import barcodeIllusLeft from "@/static/barcode-illus-left.svg";
import barcodeIllusRight from "@/static/barcode-illus-right.svg";
import { loadableUserInfoState } from "@/state";
import { useAtomValue } from "jotai";

function formatDate(value?: string) {
  if (!value) return "--/--/----";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--/--/----";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function Points() {
  const userInfo = useAtomValue(loadableUserInfoState);

  const member =
    userInfo.state === "hasData"
      ? userInfo.data
      : undefined;

  const points = Math.max(
    0,
    Number(member?.points ?? 0),
  );

  return (
    <div
      className="rounded-lg bg-primary text-white p-8 pt-6 bg-cover text-center"
      style={{
        backgroundImage: `url(${barcodeIllusLeft}), url(${barcodeIllusRight})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top left, bottom right",
        backgroundSize: "auto, auto",
      }}
    >
      <div className="text-xl font-medium opacity-95">
        {points.toLocaleString("vi-VN")} điểm
      </div>

      <div className="opacity-95 text-2xs">
        Ngày đăng ký: {formatDate(member?.registeredAt)}
      </div>

      <div className="opacity-95 text-2xs">
        Điểm có hiệu lực đến: {formatDate(member?.pointsExpireAt)}
      </div>

      <div className="bg-white rounded-lg mt-2 py-2.5 space-y-2.5 flex flex-col items-center">
        <div className="text-2xs text-subtitle text-center">
          Mã thành viên
        </div>
        <Barcode />
      </div>
    </div>
  );
}
