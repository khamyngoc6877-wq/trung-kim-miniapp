import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSetAtom } from "jotai";
import { Button, Spinner } from "zmp-ui";
import {
  clearPendingPayment,
  getOrderStatus,
  readPendingPayment,
} from "@/services/payment.service";
import { cartState } from "@/state";
import type { StoredOrder } from "@/types/payment";
import { useTranslation } from "@/hooks/use-translation";

const MAX_ATTEMPTS = 10;
const DELAY_MS = 1500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const setCart = useSetAtom(cartState);
  const pending = useMemo(() => readPendingPayment(), []);

  // Query param là fallback quan trọng nếu trang được mở lại sau redirect.
  const merchantOrderId = useMemo(
    () =>
      String(
        searchParams.get("merchantOrderId") ?? pending?.merchantOrderId ?? "",
      ).trim(),
    [pending?.merchantOrderId, searchParams],
  );

  const requestedStatus = searchParams.get("status") ?? "pending";
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(t("paymentResult", "confirming"));

  useEffect(() => {
    let cancelled = false;

    async function checkResult() {
      if (!merchantOrderId) {
        setLoading(false);
        setMessage(t("paymentResult", "missingPending"));
        return;
      }

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          // Chỉ poll backend của ứng dụng, KHÔNG gọi CheckoutSDK ở trang này.
          const result = await getOrderStatus(merchantOrderId);
          if (cancelled) return;
          setOrder(result);

          if (result.paymentStatus === "cod_confirmed") {
            setCart([]);
            clearPendingPayment();
            setLoading(false);
            setMessage(t("paymentResult", "codSuccess"));
            return;
          }

          if (result.paymentStatus === "paid") {
            setCart([]);
            clearPendingPayment();
            setLoading(false);
            setMessage(t("paymentResult", "zalopaySuccess"));
            return;
          }

          if (result.paymentStatus === "failed") {
            clearPendingPayment();
            setLoading(false);
            setMessage(result.paymentMessage || t("paymentResult", "onlineFailed"));
            return;
          }
        } catch (error) {
          console.warn(`Kiểm tra trạng thái backend lần ${attempt} thất bại`, error);
        }

        if (attempt < MAX_ATTEMPTS) {
          await wait(DELAY_MS);
        }
      }

      if (!cancelled) {
        setLoading(false);
        setMessage(
          requestedStatus === "success"
            ? t("paymentResult", "transactionPending")
            : pending?.paymentMethod === "cash"
              ? t("paymentResult", "codWaiting")
              : t("paymentResult", "transactionPending"),
        );
      }
    }

    void checkResult();
    return () => {
      cancelled = true;
    };
  }, [merchantOrderId, pending?.paymentMethod, requestedStatus, setCart, t]);

  const successful =
    order?.paymentStatus === "cod_confirmed" || order?.paymentStatus === "paid";
  const failed = order?.paymentStatus === "failed" || requestedStatus === "failed";

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

      <h1 className="text-xl font-semibold">{t("paymentResult", "title")}</h1>
      <p className="mt-3 max-w-sm text-sm text-subtitle">{message}</p>

      {order && (
        <div className="mt-5 w-full max-w-sm rounded-lg bg-section p-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <span>{t("paymentResult", "orderCode")}</span>
            <span className="font-medium">{order.code}</span>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>{t("paymentResult", "status")}</span>
            <span className="font-medium">{order.paymentStatus}</span>
          </div>
        </div>
      )}

      <div className="mt-6 flex w-full max-w-sm gap-3">
        <Button className="flex-1" variant="tertiary" onClick={() => navigate("/")}>
          {t("navigation", "home")}
        </Button>
        <Button className="flex-1" onClick={() => navigate("/orders/pending")}>
          {t("navigation", "orders")}
        </Button>
      </div>
    </div>
  );
}
