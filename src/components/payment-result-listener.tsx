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

/**
 * Checkout SDK giới hạn số lần gọi checkTransaction. Chỉ PaymentDone được dùng
 * để kiểm tra giao dịch và mỗi checkout order chỉ được kiểm tra một lần trong
 * một lượt PaymentDone. Không kiểm tra lại ở OpenApp hoặc bằng polling SDK.
 */
export default function PaymentResultListener() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const checkingRef = useRef(false);
  const lastCheckedOrderRef = useRef<string | null>(null);

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

      // Chặn event trùng và các request đồng thời gây lỗi SDK -1409/-1410.
      if (checkingRef.current || lastCheckedOrderRef.current === checkoutOrderId) {
        console.log("PAYMENT_DONE duplicate ignored:", checkoutOrderId);
        return;
      }

      checkingRef.current = true;
      lastCheckedOrderRef.current = checkoutOrderId;

      try {
        // Theo type/tài liệu đi kèm zmp-sdk: check bằng orderId do createOrder trả về.
        const result = (await CheckoutSDK.checkTransaction({
          data: { orderId: checkoutOrderId },
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
          // Người dùng hủy/đóng Checkout. Giữ giỏ hàng để có thể thử lại.
          console.log("CHECKOUT NOT COMPLETED:", result);
          toast(t("paymentResult", "notCompleted"));
          return;
        }

        params.set("status", "failed");
        toast.error(result?.msg || t("paymentResult", "failed"));
        navigate(`/payment-result?${params.toString()}`, { replace: true });
      } catch (error) {
        // Không tự retry checkTransaction: SDK có rate limit rất thấp.
        console.error("CHECK_TRANSACTION_PAYMENT_DONE_ERROR:", error);
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
