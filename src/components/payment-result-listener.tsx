import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import toast from "react-hot-toast";
import {
  CheckoutSDK,
  EventName,
  events,
} from "zmp-sdk/apis";

import { cartState } from "@/state";
import { useTranslation } from "@/hooks/use-translation";

type TransactionResult = {
  orderId?: string;
  transId?: string;
  resultCode?: number;
  msg?: string;
  transTime?: string;
  createdAt?: string;
};

const REDIRECT_PATH = "/payment-result";

export default function PaymentResultListener() {
  const navigate = useNavigate();
  const setCart = useSetAtom(cartState);
  const { t } = useTranslation();

  const processResult = useCallback(
    (result: TransactionResult) => {
      console.log("CHECKOUT TRANSACTION RESULT:", result);

      const resultCode = Number(result?.resultCode);

      if (resultCode === 1) {
        setCart([]);

        sessionStorage.removeItem("pendingPayment");
        sessionStorage.removeItem("pendingMerchantOrderId");

        toast.success(t("paymentResult", "success"));

        navigate(
          `/payment-result?status=success&orderId=${encodeURIComponent(
            String(result.orderId ?? ""),
          )}`,
          { replace: true },
        );

        return;
      }

      if (resultCode === 0) {
        toast(t("paymentResult", "pending"));

        navigate("/payment-result?status=pending", {
          replace: true,
        });

        return;
      }

      if (resultCode === -2) {
        toast(t("paymentResult", "notCompleted"));
        return;
      }

      toast.error(
        result?.msg || t("paymentResult", "failed"),
      );

      navigate("/payment-result?status=failed", {
        replace: true,
      });
    },
    [navigate, setCart, t],
  );

  const handlePaymentDone = useCallback(
    async (data: unknown) => {
      console.log("PAYMENT_DONE EVENT:", data);

      try {
        const result =
          (await CheckoutSDK.checkTransaction({
            data: data as string | Record<string, string | null | undefined>,
          })) as TransactionResult;

        processResult(result);
      } catch (error) {
        console.error(
          "CHECK_TRANSACTION_PAYMENT_DONE_ERROR:",
          error,
        );

        toast.error(
          t("paymentResult", "checkFailed"),
        );
      }
    },
    [processResult, t],
  );

  const handleOpenApp = useCallback(
    async (data: unknown) => {
      const openAppData = data as {
        path?: string;
      };

      const path = String(
        openAppData?.path ?? "",
      );

      console.log("OPEN_APP EVENT:", {
        data,
        path,
      });

      if (!path.includes(REDIRECT_PATH)) {
        return;
      }

      try {
        const result =
          (await CheckoutSDK.checkTransaction({
            data: path,
          })) as TransactionResult;

        processResult(result);
      } catch (error) {
        console.error(
          "CHECK_TRANSACTION_OPEN_APP_ERROR:",
          error,
        );

        toast.error(
          t("paymentResult", "readFailed"),
        );
      }
    },
    [processResult, t],
  );

  useEffect(() => {
    events.on(
      EventName.PaymentDone,
      handlePaymentDone,
    );

    events.on(
      EventName.OpenApp,
      handleOpenApp,
    );

    return () => {
      events.off(
        EventName.PaymentDone,
        handlePaymentDone,
      );

      events.off(
        EventName.OpenApp,
        handleOpenApp,
      );
    };
  }, [handleOpenApp, handlePaymentDone]);

  return null;
}
