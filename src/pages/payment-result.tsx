import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { Button, Spinner } from "zmp-ui";
import {
  clearPendingPayment,
  getOrderStatus,
  readPendingPayment,
} from "@/services/payment.service";
import { cartState } from "@/state";
import type { StoredOrder } from "@/types/payment";

const MAX_ATTEMPTS = 10;
const DELAY_MS = 1500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const setCart = useSetAtom(cartState);
  const pending = useMemo(() => readPendingPayment(), []);
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Đang xác nhận đơn hàng...");

  useEffect(() => {
    let cancelled = false;

    async function checkResult() {
      if (!pending?.merchantOrderId) {
        setLoading(false);
        setMessage("Không tìm thấy thông tin đơn hàng đang xử lý.");
        return;
      }

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const result = await getOrderStatus(pending.merchantOrderId);
          if (cancelled) return;
          setOrder(result);

          if (result.paymentStatus === "cod_confirmed") {
            setCart([]);
            clearPendingPayment();
            setLoading(false);
            setMessage("Đặt hàng COD thành công.");
            return;
          }

          if (result.paymentStatus === "paid") {
            setCart([]);
            clearPendingPayment();
            setLoading(false);
            setMessage("Thanh toán ZaloPay thành công.");
            return;
          }

          if (result.paymentStatus === "failed") {
            clearPendingPayment();
            setLoading(false);
            setMessage(result.paymentMessage || "Thanh toán không thành công.");
            return;
          }
        } catch (error) {
          console.warn(`Kiểm tra trạng thái lần ${attempt} thất bại`, error);
        }

        if (attempt < MAX_ATTEMPTS) {
          await wait(DELAY_MS);
        }
      }

      if (!cancelled) {
        setLoading(false);
        setMessage(
          pending.paymentMethod === "cash"
            ? "Đơn COD đang chờ hệ thống xác nhận. Bạn có thể kiểm tra lại trong mục Đơn hàng."
            : "Giao dịch đang được xử lý. Vui lòng kiểm tra lại sau.",
        );
      }
    }

    void checkResult();
    return () => {
      cancelled = true;
    };
  }, [pending, setCart]);

  const successful =
    order?.paymentStatus === "cod_confirmed" || order?.paymentStatus === "paid";
  const failed = order?.paymentStatus === "failed";

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6 text-center">
      {loading ? (
        <Spinner visible />
      ) : (
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            successful
              ? "bg-green-100 text-green-600"
              : failed
                ? "bg-red-100 text-red-600"
                : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {successful ? "✓" : failed ? "×" : "…"}
        </div>
      )}

      <h1 className="text-xl font-semibold">Kết quả thanh toán</h1>
      <p className="mt-3 max-w-sm text-sm text-subtitle">{message}</p>

      {order && (
        <div className="mt-5 w-full max-w-sm rounded-lg bg-section p-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <span>Mã đơn</span>
            <span className="font-medium">{order.code}</span>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Trạng thái</span>
            <span className="font-medium">{order.paymentStatus}</span>
          </div>
        </div>
      )}

      <div className="mt-6 flex w-full max-w-sm gap-3">
        <Button className="flex-1" variant="tertiary" onClick={() => navigate("/")}> 
          Trang chủ
        </Button>
        <Button className="flex-1" onClick={() => navigate("/orders/pending")}> 
          Đơn hàng
        </Button>
      </div>
    </div>
  );
}
