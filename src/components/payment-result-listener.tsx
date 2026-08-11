import {
  useCallback,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import toast from "react-hot-toast";

import {
  CheckoutSDK,
  EventName,
  events,
} from "zmp-sdk/apis";

import { cartState } from "@/state";

import {
  clearPendingPayment,
  readPendingPayment,
} from "@/services/payment.service";

import { useTranslation } from "@/hooks/use-translation";

type TransactionResult = {
  orderId?: string;
  zmpOrderId?: string;
  transId?: string;
  resultCode?: number;
  msg?: string;
  transTime?: string;
  createdAt?: string;
};

const REDIRECT_PATH =
  "/payment-result";

export default function PaymentResultListener() {
  const navigate = useNavigate();

  const setCart =
    useSetAtom(cartState);

  const { t } =
    useTranslation();

  /**
   * Xử lý kết quả trả về từ
   * CheckoutSDK.checkTransaction()
   */
  const processResult = useCallback(
    (
      result: TransactionResult,
    ) => {
      console.log(
        "CHECKOUT TRANSACTION RESULT:",
        result,
      );

      const resultCode =
        Number(result?.resultCode);

      const pending =
        readPendingPayment();

      const orderId =
        String(
          result?.orderId ??
            result?.zmpOrderId ??
            "",
        ).trim();

      /**
       * 1 = thành công
       */
      if (resultCode === 1) {
  const merchantOrderId =
    pending?.merchantOrderId ?? "";

  console.log("CHECKOUT SUCCESS:", {
    result,
    merchantOrderId,
  });

  setCart([]);

  toast.success(
    t("paymentResult", "success"),
  );

  const params =
    new URLSearchParams();

  params.set(
    "status",
    "success",
  );

  if (orderId) {
    params.set(
      "orderId",
      orderId,
    );
  }

  if (merchantOrderId) {
    params.set(
      "merchantOrderId",
      merchantOrderId,
    );
  }

  clearPendingPayment();

  navigate(
    `/payment-result?${params.toString()}`,
    {
      replace: true,
    },
  );

  return;
}

      /**
       * 0 = đang xử lý / chờ xử lý
       */
      if (resultCode === 0) {
        console.log(
          "CHECKOUT PENDING:",
          {
            result,
            pending,
          },
        );

        /**
         * KHÔNG xóa pending payment.
         *
         * Trang payment-result còn cần
         * merchantOrderId để kiểm tra
         * trạng thái backend.
         */
        toast(
          t(
            "paymentResult",
            "pending",
          ),
        );

        const params =
          new URLSearchParams();

        params.set(
          "status",
          "pending",
        );

        if (
          pending?.merchantOrderId
        ) {
          params.set(
            "merchantOrderId",
            pending.merchantOrderId,
          );
        }

        navigate(
          `/payment-result?${params.toString()}`,
          {
            replace: true,
          },
        );

        return;
      }

      /**
       * -2 = người dùng thoát Checkout
       * mà chưa hoàn tất.
       */
      if (resultCode === -2) {
        console.log(
          "CHECKOUT NOT COMPLETED:",
          result,
        );

        toast(
          t(
            "paymentResult",
            "notCompleted",
          ),
        );

        /**
         * Không xóa giỏ.
         * Không xóa pending ở đây.
         */
        return;
      }

      /**
       * -1 hoặc mã lỗi khác
       */
      console.error(
        "CHECKOUT FAILED:",
        result,
      );

      clearPendingPayment();

      toast.error(
        result?.msg ||
          t(
            "paymentResult",
            "failed",
          ),
      );

      navigate(
        "/payment-result?status=failed",
        {
          replace: true,
        },
      );
    },
    [
      navigate,
      setCart,
      t,
    ],
  );

  /**
   * LUỒNG CHÍNH
   *
   * ZMP SDK >= 2.45:
   *
   * PaymentDone
   * →
   * checkTransaction
   * →
   * processResult
   */
  const handlePaymentDone =
    useCallback(
      async (
        data: unknown,
      ) => {
        console.log(
          "PAYMENT_DONE EVENT:",
          data,
        );

        try {
          const result =
            (await CheckoutSDK
              .checkTransaction({
                data:
                  data as
                    | string
                    | Record<
                        string,
                        string |
                          null |
                          undefined
                      >,
              })) as TransactionResult;

          processResult(
            result,
          );
        } catch (error) {
          console.error(
            "CHECK_TRANSACTION_PAYMENT_DONE_ERROR:",
            error,
          );

          /**
           * Không xóa pending ở đây.
           * Có thể giao dịch đã được tạo
           * nhưng checkTransaction tạm lỗi.
           */
          toast.error(
            t(
              "paymentResult",
              "checkFailed",
            ),
          );
        }
      },
      [
        processResult,
        t,
      ],
    );

  /**
   * FALLBACK
   *
   * Giữ OpenApp để tương thích
   * trường hợp Checkout redirect
   * về Mini App.
   */
  const handleOpenApp =
    useCallback(
      async (
        data: unknown,
      ) => {
        const openAppData =
          data as {
            path?: string;
          };

        const path =
          String(
            openAppData?.path ??
              "",
          );

        console.log(
          "OPEN_APP EVENT:",
          {
            data,
            path,
          },
        );

        if (
          !path.includes(
            REDIRECT_PATH,
          )
        ) {
          return;
        }

        try {
          const result =
            (await CheckoutSDK
              .checkTransaction({
                data: path,
              })) as TransactionResult;

          processResult(
            result,
          );
        } catch (error) {
          console.error(
            "CHECK_TRANSACTION_OPEN_APP_ERROR:",
            error,
          );

          toast.error(
            t(
              "paymentResult",
              "readFailed",
            ),
          );
        }
      },
      [
        processResult,
        t,
      ],
    );

  useEffect(() => {
    console.log(
      "REGISTER CHECKOUT EVENTS",
    );

    /**
     * Luồng chính.
     */
    events.on(
      EventName.PaymentDone,
      handlePaymentDone,
    );

    /**
     * Fallback.
     */
    events.on(
      EventName.OpenApp,
      handleOpenApp,
    );

    return () => {
      console.log(
        "UNREGISTER CHECKOUT EVENTS",
      );

      events.off(
        EventName.PaymentDone,
        handlePaymentDone,
      );

      events.off(
        EventName.OpenApp,
        handleOpenApp,
      );
    };
  }, [
    handleOpenApp,
    handlePaymentDone,
  ]);

  return null;
}