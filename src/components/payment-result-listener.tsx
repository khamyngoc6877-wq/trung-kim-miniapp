import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOrderStatus,
  readPendingPayment,
} from "@/services/payment.service";

const RESULT_PATH = "/payment-result";

export default function PaymentResultListener() {
  const navigate = useNavigate();
  const checkingRef = useRef(false);

  const checkPending = useCallback(async () => {
    if (checkingRef.current) return;

    const pending = readPendingPayment();
    if (!pending?.merchantOrderId) return;

    checkingRef.current = true;
    try {
      const order = await getOrderStatus(pending.merchantOrderId);
      const completed =
        order.paymentStatus === "cod_confirmed" ||
        order.paymentStatus === "paid" ||
        order.paymentStatus === "failed";

      if (completed && window.location.pathname !== RESULT_PATH) {
        navigate(RESULT_PATH, { replace: true });
      }
    } catch (error) {
      console.warn("Chưa thể kiểm tra kết quả thanh toán", error);
    } finally {
      checkingRef.current = false;
    }
  }, [navigate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkPending();
      }
    };

    const handleFocus = () => {
      void checkPending();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    const timer = window.setTimeout(() => {
      void checkPending();
    }, 300);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkPending]);

  return null;
}
