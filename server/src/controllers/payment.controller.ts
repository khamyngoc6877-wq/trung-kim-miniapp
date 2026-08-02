import type { Request, Response } from "express";

import {
  bindCheckoutOrder,
  findOrderByCheckoutOrderId,
  findOrderById,
  findOrderByTransactionId,
  updateCodNotify,
  updateOnlinePayment,
} from "../services/order.service.js";

import { preparePaymentData } from "../services/payment.service.js";

import {
  type CallbackData,
  verifyCallbackMac,
  verifyNotifyMac,
  verifyOverallMac,
} from "../utils/payment-mac.js";

/**
 * Tạo dữ liệu đã ký để Mini App gọi Payment.createOrder().
 */
export async function createSignature(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const orderId = String(
      req.body?.orderId ?? "",
    ).trim();

    console.log("CREATE_SIGNATURE_REQUEST:", {
      orderId,
    });

    if (!orderId) {
      res.status(400).json({
        message: "orderId không hợp lệ",
      });
      return;
    }

    const order = await findOrderById(orderId);

    if (!order) {
      console.error(
        "CREATE_SIGNATURE_ORDER_NOT_FOUND:",
        orderId,
      );

      res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
      return;
    }

    if (
      order.paymentStatus === "paid" ||
      order.paymentStatus === "cod_confirmed"
    ) {
      res.status(409).json({
        message: "Đơn hàng đã được xác nhận",
      });
      return;
    }

    const environment =
      process.env.PAYMENT_ENVIRONMENT === "production"
        ? "production"
        : "sandbox";

    const paymentData = preparePaymentData(
      order,
      environment,
    );

    console.log("CREATE_SIGNATURE_SUCCESS:", {
      merchantOrderId: order.id,
      orderCode: order.code,
      paymentMethod: order.paymentMethod,
      amount: paymentData.amount,
      method: paymentData.method,
      hasMac: Boolean(paymentData.mac),
    });

    res.status(200).json(paymentData);
  } catch (error) {
    console.error(
      "CREATE_SIGNATURE_ERROR:",
      error,
    );

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Không thể tạo dữ liệu thanh toán",
    });
  }
}

/**
 * Liên kết mã đơn nội bộ với orderId do Checkout SDK tạo.
 */
export async function bindCheckout(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const merchantOrderId = String(
      req.body?.merchantOrderId ?? "",
    ).trim();

    const checkoutOrderId = String(
      req.body?.checkoutOrderId ?? "",
    ).trim();

    console.log("BIND_CHECKOUT_REQUEST:", {
      merchantOrderId,
      checkoutOrderId,
    });

    if (
      !merchantOrderId ||
      !checkoutOrderId
    ) {
      res.status(400).json({
        message: "Thiếu mã đơn hàng",
      });
      return;
    }

    const order = await bindCheckoutOrder(
      merchantOrderId,
      checkoutOrderId,
    );

    console.log("BIND_CHECKOUT_SUCCESS:", {
      merchantOrderId,
      checkoutOrderId,
      paymentStatus:
        order?.paymentStatus,
    });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error(
      "BIND_CHECKOUT_ERROR:",
      error,
    );

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Không thể liên kết mã Checkout",
    });
  }
}

/**
 * Notify dành cho COD hoặc chuyển khoản ngân hàng.
 */
export async function paymentNotify(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    console.log(
      "PAYMENT_NOTIFY_BODY:",
      JSON.stringify(req.body),
    );

    const data = req.body?.data as
      | {
          appId?: string;
          orderId?: string;
          method?: string;
        }
      | undefined;

    const mac = String(
      req.body?.mac ?? "",
    ).trim();

    if (
      !data?.appId ||
      !data?.orderId ||
      !data?.method ||
      !mac
    ) {
      console.error(
        "PAYMENT_NOTIFY_INVALID_DATA:",
        req.body,
      );

      res.status(400).json({
        returnCode: -1,
        returnMessage:
          "Invalid notify data",
      });
      return;
    }

    const privateKey =
      process.env
        .PAYMENT_PRIVATE_KEY
        ?.trim();

    if (!privateKey) {
      throw new Error(
        "Thiếu PAYMENT_PRIVATE_KEY",
      );
    }

    const valid = verifyNotifyMac({
      appId: String(data.appId),
      orderId: String(data.orderId),
      method: String(data.method),
      receivedMac: mac,
      privateKey,
    });

    console.log(
      "PAYMENT_NOTIFY_MAC_RESULT:",
      {
        valid,
        checkoutOrderId:
          data.orderId,
        method: data.method,
      },
    );

    if (!valid) {
      res.status(401).json({
        returnCode: -1,
        returnMessage: "Invalid MAC",
      });
      return;
    }

    const beforeUpdate =
      await findOrderByCheckoutOrderId(
        String(data.orderId),
      );

    console.log(
      "PAYMENT_NOTIFY_ORDER_BEFORE:",
      beforeUpdate
        ? {
            merchantOrderId:
              beforeUpdate.id,
            checkoutOrderId:
              beforeUpdate.checkoutOrderId,
            paymentStatus:
              beforeUpdate.paymentStatus,
          }
        : null,
    );

    if (!beforeUpdate) {
      console.error(
        "PAYMENT_NOTIFY_ORDER_NOT_FOUND:",
        {
          checkoutOrderId:
            data.orderId,
        },
      );

      res.status(404).json({
        returnCode: -1,
        returnMessage:
          "Order not found",
      });
      return;
    }

    const order =
      await updateCodNotify({
        checkoutOrderId:
          String(data.orderId),
        providerMethod:
          String(data.method),
      });

    if (!order) {
      console.error(
        "PAYMENT_NOTIFY_UPDATE_FAILED:",
        {
          checkoutOrderId:
            data.orderId,
        },
      );

      res.status(500).json({
        returnCode: -1,
        returnMessage:
          "Cannot update order",
      });
      return;
    }

    console.log(
      "PAYMENT_NOTIFY_SUCCESS:",
      {
        merchantOrderId:
          order.id,
        checkoutOrderId:
          order.checkoutOrderId,
        paymentStatus:
          order.paymentStatus,
        providerMethod:
          order.providerMethod,
      },
    );

    res.status(200).json({
      returnCode: 1,
      returnMessage: "Success",
    });
  } catch (error) {
    console.error(
      "PAYMENT_NOTIFY_ERROR:",
      error,
    );

    res.status(500).json({
      returnCode: -1,
      returnMessage:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
}

function decodeExtraData(
  value?: string,
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  const candidates = [value];

  try {
    candidates.push(
      decodeURIComponent(value),
    );
  } catch {
    // Giữ nguyên giá trị ban đầu.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(
        candidate,
      ) as Record<
        string,
        unknown
      >;
    } catch {
      // Thử giá trị tiếp theo.
    }
  }

  return {};
}

/**
 * Callback dành cho thanh toán online như ZaloPay.
 */
export async function paymentCallback(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    console.log(
      "PAYMENT_CALLBACK_BODY:",
      JSON.stringify(req.body),
    );

    const data =
      req.body?.data as
        | CallbackData
        | undefined;

    const mac = String(
      req.body?.mac ?? "",
    ).trim();

    const overallMac = String(
      req.body?.overallMac ?? "",
    ).trim();

    if (
      !data ||
      !mac ||
      !overallMac
    ) {
      res.status(400).json({
        returnCode: -1,
        returnMessage:
          "Invalid callback data",
      });
      return;
    }

    const privateKey =
      process.env
        .PAYMENT_PRIVATE_KEY
        ?.trim();

    if (!privateKey) {
      throw new Error(
        "Thiếu PAYMENT_PRIVATE_KEY",
      );
    }

    const callbackMacValid =
      verifyCallbackMac(
        data,
        mac,
        privateKey,
      );

    const overallMacValid =
      verifyOverallMac(
        data,
        overallMac,
        privateKey,
      );

    console.log(
      "PAYMENT_CALLBACK_MAC_RESULT:",
      {
        callbackMacValid,
        overallMacValid,
      },
    );

    if (
      !callbackMacValid ||
      !overallMacValid
    ) {
      res.status(401).json({
        returnCode: -1,
        returnMessage:
          "Invalid callback MAC",
      });
      return;
    }

    const duplicate =
      await findOrderByTransactionId(
        String(data.transId),
      );

    if (
      duplicate?.paymentStatus ===
      "paid"
    ) {
      res.status(200).json({
        returnCode: 2,
        returnMessage:
          "Transaction processed",
      });
      return;
    }

    const extra =
      decodeExtraData(
        data.extradata,
      );

    const merchantOrderId =
      String(
        extra.merchantOrderId ??
          "",
      ).trim();

    const order =
      merchantOrderId
        ? await findOrderById(
            merchantOrderId,
          )
        : await findOrderByCheckoutOrderId(
            String(data.orderId),
          );

    if (!order) {
      console.error(
        "PAYMENT_CALLBACK_ORDER_NOT_FOUND:",
        {
          merchantOrderId,
          checkoutOrderId:
            data.orderId,
        },
      );

      res.status(404).json({
        returnCode: -1,
        returnMessage:
          "Order not found",
      });
      return;
    }

    if (
      Number(order.totalAmount) !==
      Number(data.amount)
    ) {
      res.status(400).json({
        returnCode: -1,
        returnMessage:
          "Amount mismatch",
      });
      return;
    }

    const updatedOrder =
      await updateOnlinePayment({
        merchantOrderId:
          order.id,
        checkoutOrderId:
          String(data.orderId),
        transId:
          String(data.transId),
        providerMethod:
          String(data.method),
        message:
          data.message,
        success:
          Number(
            data.resultCode,
          ) === 1,
      });

    console.log(
      "PAYMENT_CALLBACK_SUCCESS:",
      {
        merchantOrderId:
          updatedOrder?.id ??
          order.id,
        checkoutOrderId:
          data.orderId,
        paymentStatus:
          updatedOrder
            ?.paymentStatus,
      },
    );

    res.status(200).json({
      returnCode: 1,
      returnMessage: "Success",
    });
  } catch (error) {
    console.error(
      "PAYMENT_CALLBACK_ERROR:",
      error,
    );

    res.status(500).json({
      returnCode: -1,
      returnMessage:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
}