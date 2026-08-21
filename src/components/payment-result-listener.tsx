import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckoutSDK, EventName, events } from "zmp-sdk/apis";

import { readPendingPayment } from "@/services/payment.service";
import { useTranslation } from "@/hooks/use-translation";

type TransactionResult = {
  err?: number;
  orderId?: string;
  transId?: string;
  resultCode?: number;
  msg?: string;
  transTime?: string;
  createdAt?: string;
};

const CHECK_LOCK_PREFIX = "trung-kim.checkout-check:";
const CHECK_DELAY_MS = 900;
const CHECK_LOCK_TTL_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getCheckLock(orderId: string): number {
  const value = Number(sessionStorage.getItem(`${CHECK_LOCK_PREFIX}${orderId}`));
  return Number.isFinite(value) ? value : 0;
}

function setCheckLock(orderId: string): void {
  sessionStorage.setItem(`${CHECK_LOCK_PREFIX}${orderId}`, String(Date.now()));
}

function clearCheckLock(orderId: string): void {
  sessionStorage.removeItem(`${CHECK_LOCK_PREFIX}${orderId}`);
}

/**
 * Checkout SDK chỉ cho phép số lần checkTransaction rất thấp.
 * Listener này chỉ kiểm tra 1 lần cho mỗi PaymentDone và có khóa sessionStorage
 * để tránh React remount / event trùng tạo lỗi -1409 / -1410.
 */
export default function PaymentResultListener() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const checkingRef = useRef(false);

  const handlePaymentDone = useCallback(
    async (eventData: unknown) => {
      const pending = readPendingPayment();
      const checkoutOrderId = String(pending?.checkoutOrderId ?? "").trim();

      console.log("PAYMENT_DONE EVENT:", eventData, {
        merchantOrderId: pending?.merchantOrderId,
        checkoutOrderId,
      });

      if (!pending?.merchantOrderId || !checkoutOrderId) {
        console.warn("PAYMENT_DONE ignored: missing pending Checkout order");
        return;
      }

      if (checkingRef.current) {
        console.log("PAYMENT_DONE ignored: checkTransaction is running");
        return;
      }

      const previousCheckAt = getCheckLock(checkoutOrderId);
      if (previousCheckAt > 0 && Date.now() - previousCheckAt < CHECK_LOCK_TTL_MS) {
        console.log("PAYMENT_DONE duplicate ignored:", checkoutOrderId);
        return;
      }

      checkingRef.current = true;
      setCheckLock(checkoutOrderId);

      try {
        // Đợi Checkout đóng/redirect ổn định rồi mới check đúng 1 lần.
        await sleep(CHECK_DELAY_MS);

        const data =
          typeof eventData === "string"
            ? eventData
            : eventData && typeof eventData === "object"
              ? (eventData as Record<string, string | null | undefined>)
              : ({ orderId: checkoutOrderId } as Record<
                  string,
                  string | null | undefined
                >);

        const result = (await CheckoutSDK.checkTransaction({
          data: data as string | Record<string, string | null | undefined>,
        })) as TransactionResult;

        console.log("CHECKOUT TRANSACTION RESULT:", result);

        const resultCode = Number(result?.resultCode);
        const params = new URLSearchParams();
        params.set("merchantOrderId", pending.merchantOrderId);
        params.set("checkoutOrderId", checkoutOrderId);

        if (resultCode === 1) {
          params.set("status", "success");
          toast.success(t("paymentResult", "success"));
          navigate(`/payment-result?${params.toString()}`, { replace: true });
          return;
        }

        if (resultCode === 0) {
          params.set("status", "pending");
          toast(t("paymentResult", "pending"));
          navigate(`/payment-result?${params.toString()}`, { replace: true });
          return;
        }

        if (resultCode === -2) {
          // Checkout chưa hoàn tất. Không retry tự động để tránh rate limit.
          console.log("CHECKOUT NOT COMPLETED:", result);
          toast(t("paymentResult", "notCompleted"));
          return;
        }

        params.set("status", "failed");
        toast.error(result?.msg || t("paymentResult", "failed"));
        navigate(`/payment-result?${params.toString()}`, { replace: true });
      } catch (error) {
        console.error("CHECK_TRANSACTION_PAYMENT_DONE_ERROR:", error);

        const code =
          typeof error === "object" && error
            ? Number((error as { code?: number }).code)
            : Number.NaN;

        // -1409/-1410 là giới hạn/duplicate request. Không retry vòng lặp.
        if (code === -1409 || code === -1410) {
          toast(t("paymentResult", "checkFailed"));
          return;
        }

        // Lỗi khác có thể thử lại khi có PaymentDone mới.
        clearCheckLock(checkoutOrderId);
        toast.error(t("paymentResult", "checkFailed"));
      } finally {
        checkingRef.current = false;
      }
    },
    [navigate, t],
  );

  useEffect(() => {
    events.on(EventName.PaymentDone, handlePaymentDone);

    return () => {
      events.off(EventName.PaymentDone, handlePaymentDone);
    };
  }, [handlePaymentDone]);

  return null;
}
