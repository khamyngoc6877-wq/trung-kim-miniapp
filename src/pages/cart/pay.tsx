import { useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { Button, Radio, Sheet } from "zmp-ui";
import { useCheckout } from "@/hooks/use-checkout";
import { useTranslation } from "@/hooks/use-translation";
import { cartState, cartTotalState } from "@/state";
import { appliedVoucherState } from "@/state/voucher";
import {
  deliveryModeState,
  shippingAddressState,
} from "@/state/shipping";
import type { PaymentMethod } from "@/types/payment";
import { formatPrice } from "@/utils/format";
import {
  calculateShippingFee,
  detectShippingArea,
  FREE_SHIPPING_MINIMUM,
  type ShippingMethod,
} from "@/utils/shipping";

const ZALOPAY_ENABLED =
  String(import.meta.env.VITE_ENABLE_ZALOPAY ?? "false") === "true";

export default function Pay() {
  const cart = useAtomValue(cartState);
  const { totalAmount: subtotal } = useAtomValue(cartTotalState);
  const shippingAddress = useAtomValue(shippingAddressState);
  const appliedVoucher = useAtomValue(appliedVoucherState);
  const [deliveryMode, setDeliveryMode] = useAtom(deliveryModeState);

  const checkout = useCheckout();
  const { t } = useTranslation();

  const [paying, setPaying] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");

  const shippingMethod: ShippingMethod =
    deliveryMode === "shipping" ? "delivery" : "pickup";

  const isPickup = shippingMethod === "pickup";

  const shippingArea = useMemo(
    () => detectShippingArea(shippingAddress?.address),
    [shippingAddress?.address],
  );

  const shippingFee = useMemo(
    () =>
      calculateShippingFee({
        subtotal,
        area: shippingArea,
        method: shippingMethod,
      }),
    [subtotal, shippingArea, shippingMethod],
  );

  const discountAmount = Math.min(
    appliedVoucher?.discountAmount ?? 0,
    subtotal,
  );

  const finalTotal = Math.max(
    0,
    subtotal + shippingFee - discountAmount,
  );

  const paymentItems = useMemo(
    () =>
      cart.map((cartItem) => ({
        id: String(cartItem.product.id),
        name:
          cartItem.product.name ??
          t("payment", "defaultProductName"),
        quantity: cartItem.quantity,
        amount:
          cartItem.product.price * cartItem.quantity,
      })),
    [cart, t],
  );

  const isMissingAddress =
    shippingMethod === "delivery" &&
    !shippingAddress?.address?.trim();

  const isFreeShipping = subtotal > 0 && shippingFee === 0;

  const canCheckout =
    !paying &&
    subtotal > 0 &&
    !isMissingAddress &&
    paymentItems.length > 0;

  const handleOpenPaymentSheet = () => {
    if (subtotal <= 0) {
      toast.error(t("payment", "emptyCart"));
      return;
    }

    setShowPaymentSheet(true);
  };

  const handleCheckout = async () => {
    if (paying || subtotal <= 0) {
      return;
    }

    if (paymentItems.length === 0) {
      toast.error(t("payment", "emptyOrder"));
      return;
    }

    if (isMissingAddress) {
      toast.error(t("payment", "missingAddress"));
      return;
    }

    if (paymentMethod === "zalopay" && !ZALOPAY_ENABLED) {
      toast.error(t("payment", "zalopayUnavailable"));
      return;
    }

    try {
      setPaying(true);

      const result = await checkout({
        subtotal,
        shippingFee,
        discountAmount,
        voucherCode: appliedVoucher?.code,
        totalAmount: finalTotal,
        shippingMethod,
        shippingArea:
          shippingMethod === "delivery"
            ? shippingArea
            : undefined,
        shippingAddress:
          shippingMethod === "delivery"
            ? shippingAddress
            : undefined,
        paymentMethod,
        items: paymentItems,
      });

      console.log("Checkout result:", result);

      /**
       * Không tự đánh dấu COD thành công tại đây. Payment.createOrder() chỉ
       * tạo/mở Checkout. Kết quả cuối cùng phải đi qua PaymentDone ->
       * CheckoutSDK.checkTransaction() để Zalo ghi nhận đúng luồng Checkout.
       */
      setShowPaymentSheet(false);

      console.log("WAITING FOR CHECKOUT PAYMENT_DONE:", {
        paymentMethod,
        merchantOrderId: result.order.orderId,
        checkoutOrderId: result.checkoutOrderId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("payment", "failed");

      console.error("CHECKOUT_ERROR:", error);
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <div className="flex-none border-t bg-section px-4 py-3">
        <div className="space-y-3">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-subtitle">
              {t("cart", "productAmount")}
            </span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between gap-4 text-sm">
            <span className="text-subtitle">
              {t("cart", "shippingFee")}
            </span>
            <span
              className={
                shippingFee === 0
                  ? "font-medium text-green-600"
                  : ""
              }
            >
              {shippingFee === 0
                ? t("cart", "freeShipping")
                : formatPrice(shippingFee)}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between gap-4 text-sm text-green-600">
              <span>Voucher {appliedVoucher?.code}</span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between gap-4 text-sm">
            <span className="text-subtitle">
              {t("cart", "receivingMethod")}
            </span>
            <span>
              {isPickup
                ? t("cart", "pickup")
                : t("cart", "delivery")}
            </span>
          </div>

          <div className="flex items-center gap-3 border-t pt-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                {t("cart", "total")}
              </div>
              <div className="text-lg font-semibold text-primary">
                {formatPrice(finalTotal)}
              </div>
            </div>

            <Button
              disabled={paying || subtotal <= 0}
              onClick={handleOpenPaymentSheet}
            >
              {t("cart", "payment")}
            </Button>
          </div>
        </div>
      </div>

      <Sheet
        visible={showPaymentSheet}
        onClose={() => {
          if (!paying) {
            setShowPaymentSheet(false);
          }
        }}
        mask
        handler
        swipeToClose={!paying}
        title={t("payment", "information")}
      >
        <div
          className="flex min-h-0 flex-col bg-section"
          style={{
            height: "calc(100dvh - 96px)",
            maxHeight: "calc(100dvh - 96px)",
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-5">
              <section>
                <div className="mb-3 font-medium">
                  {t("cart", "shippingMethod")}
                </div>

                <Radio.Group
                  value={shippingMethod}
                  onChange={(value) => {
                    setDeliveryMode(
                      value === "delivery"
                        ? "shipping"
                        : "pickup",
                    );
                  }}
                >
                  <div className="space-y-3">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                        shippingMethod === "delivery"
                          ? "border-primary bg-primary/5"
                          : "border-gray-200"
                      }`}
                    >
                      <Radio value="delivery" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {t("cart", "delivery")}
                        </div>
                        <div className="text-xs text-subtitle">
                          {t("cart", "deliveryDescription")}
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                        shippingMethod === "pickup"
                          ? "border-primary bg-primary/5"
                          : "border-gray-200"
                      }`}
                    >
                      <Radio value="pickup" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {t("cart", "pickup")}
                        </div>
                        <div className="text-xs text-green-600">
                          {t("cart", "freeShipping")}
                        </div>
                      </div>
                    </label>
                  </div>
                </Radio.Group>
              </section>

              {shippingMethod === "delivery" && (
                <section
                  className={`rounded-lg border p-4 ${
                    isMissingAddress
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="font-medium">
                    {shippingArea === "hcm"
                      ? t("cart", "hcm")
                      : t("cart", "otherArea")}
                  </div>
                  <div
                    className={`mt-1 break-words text-xs ${
                      isMissingAddress
                        ? "text-red-600"
                        : "text-subtitle"
                    }`}
                  >
                    {shippingAddress?.address?.trim() ||
                      t("cart", "missingAddressText")}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-3 font-medium">
                  {t("payment", "paymentMethod")}
                </div>

                <Radio.Group
                  value={paymentMethod}
                  onChange={(value) =>
                    setPaymentMethod(value as PaymentMethod)
                  }
                >
                  <div className="space-y-3">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                        paymentMethod === "cash"
                          ? "border-primary bg-primary/5"
                          : "border-gray-200"
                      }`}
                    >
                      <Radio value="cash" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {t("payment", "cod")}
                        </div>
                        <div className="text-xs text-subtitle">COD</div>
                      </div>
                    </label>

                    {ZALOPAY_ENABLED ? (
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                          paymentMethod === "zalopay"
                            ? "border-primary bg-primary/5"
                            : "border-gray-200"
                        }`}
                      >
                        <Radio value="zalopay" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            {t("payment", "zalopay")}
                          </div>
                          <div className="text-xs text-subtitle">
                            {t("payment", "onlinePayment")}
                          </div>
                        </div>
                      </label>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-subtitle">
                        {t("payment", "zalopayHidden")}
                      </div>
                    )}
                  </div>
                </Radio.Group>
              </section>

              <section className="space-y-3 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between gap-4 text-sm">
                  <span>{t("cart", "productAmount")}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span>{t("cart", "shippingFee")}</span>
                  <span>
                    {shippingFee === 0
                      ? t("cart", "freeShippingShort")
                      : formatPrice(shippingFee)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between gap-4 text-sm text-green-600">
                    <span>Voucher {appliedVoucher?.code}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between gap-4 border-t pt-3">
                  <span className="font-medium">
                    {t("cart", "total")}
                  </span>
                  <span className="text-lg font-semibold text-primary">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </section>

              {isMissingAddress && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {t("payment", "missingAddress")}
                </div>
              )}

              {shippingMethod === "delivery" &&
                subtotal > 0 &&
                subtotal < FREE_SHIPPING_MINIMUM && (
                  <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-700">
                    {t("cart", "buyMore")} {formatPrice(
                      FREE_SHIPPING_MINIMUM - subtotal,
                    )} {t("cart", "toGetFreeShipping")}
                  </div>
                )}

              {!isPickup &&
                isFreeShipping &&
                subtotal >= FREE_SHIPPING_MINIMUM && (
                  <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
                    {t("cart", "freeShippingApplied")}
                  </div>
                )}

              <div className="h-2" />
            </div>
          </div>

          <div
            className="flex-none border-t bg-section px-4 pt-3"
            style={{
              paddingBottom:
                "max(16px, env(safe-area-inset-bottom))",
            }}
          >
            <Button
              fullWidth
              loading={paying}
              disabled={!canCheckout}
              onClick={handleCheckout}
            >
              {paymentMethod === "cash"
                ? t("payment", "placeCodOrder")
                : t("payment", "payWithZaloPay")}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}