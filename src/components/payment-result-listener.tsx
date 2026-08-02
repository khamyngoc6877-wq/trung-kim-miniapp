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

  const processResult = useCallback(
    (result: TransactionResult) => {
      console.log("CHECKOUT TRANSACTION RESULT:", result);

      const resultCode = Number(result?.resultCode);

      if (resultCode === 1) {
        // Chỉ xóa giỏ khi Zalo xác nhận giao dịch thành công
        setCart([]);

        sessionStorage.removeItem("pendingPayment");
        sessionStorage.removeItem("pendingMerchantOrderId");

        toast.success("Đặt hàng thành công");

        navigate(
          `/payment-result?status=success&orderId=${encodeURIComponent(
            String(result.orderId ?? ""),
          )}`,
          { replace: true },
        );

        return;
      }

      if (resultCode === 0) {
        toast("Đơn hàng đang được xử lý");

        navigate("/payment-result?status=pending", {
          replace: true,
        });

        return;
      }

      if (resultCode === -2) {
        toast("Bạn chưa hoàn tất xác nhận thanh toán");
        return;
      }

      toast.error(
        result?.msg || "Đặt hàng không thành công",
      );

      navigate("/payment-result?status=failed", {
        replace: true,
      });
    },
    [navigate, setCart],
  );

  /**
   * Cách chính dành cho SDK mới:
   * PaymentDone → checkTransaction → xử lý resultCode.
   */
  const handlePaymentDone = useCallback(
    async (data: unknown) => {
      console.log("PAYMENT_DONE EVENT:", data);

      try {
        const result =
          (await CheckoutSDK.checkTransaction({
            data,
          })) as TransactionResult;

        processResult(result);
      } catch (error) {
        console.error(
          "CHECK_TRANSACTION_PAYMENT_DONE_ERROR:",
          error,
        );

        toast.error(
          "Không thể kiểm tra kết quả đặt hàng",
        );
      }
    },
    [processResult],
  );

  /**
   * Phương án dự phòng:
   * Checkout chuyển về Redirect Path và phát OpenApp.
   */
  const handleOpenApp = useCallback(
    async (data: any) => {
      const path = String(data?.path ?? "");

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
          "Không thể đọc kết quả đặt hàng",
        );
      }
    },
    [processResult],
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