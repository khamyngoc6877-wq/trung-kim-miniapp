import { useCheckout } from "@/hooks/use-checkout";
import { useAtom, useAtomValue } from "jotai";
import {
  cartState,
  cartTotalState,
  deliveryModeState,
  shippingAddressState,
} from "@/state";
import type { PaymentMethod } from "@/types/payment";
import { formatPrice } from "@/utils/format";
import {
  calculateShippingFee,
  detectShippingArea,
  FREE_SHIPPING_MINIMUM,
  type ShippingMethod,
} from "@/utils/shipping";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Radio, Sheet } from "zmp-ui";

const ZALOPAY_ENABLED =
  String(import.meta.env.VITE_ENABLE_ZALOPAY ?? "false") === "true";

export default function Pay() {
  const cart = useAtomValue(cartState);
  const { totalAmount: subtotal } = useAtomValue(cartTotalState);
  const shippingAddress = useAtomValue(shippingAddressState);

  const [deliveryMode, setDeliveryMode] = useAtom(deliveryModeState);

  const checkout = useCheckout();

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

  const finalTotal = subtotal + shippingFee;

  const paymentItems = useMemo(
    () =>
      cart.map((cartItem) => ({
        id: String(cartItem.product.id),
        name: cartItem.product.name ?? "Sản phẩm",
        quantity: cartItem.quantity,
        amount: cartItem.product.price * cartItem.quantity,
      })),
    [cart],
  );

  const isMissingAddress =
    shippingMethod === "delivery" &&
    !shippingAddress?.address?.trim();

  const isFreeShipping =
    subtotal > 0 && shippingFee === 0;

  const canCheckout =
    !paying &&
    subtotal > 0 &&
    !isMissingAddress &&
    paymentItems.length > 0;

  const handleOpenPaymentSheet = () => {
    if (subtotal <= 0) {
      toast.error("Giỏ hàng chưa có sản phẩm");
      return;
    }

    setShowPaymentSheet(true);
  };

  const handleCheckout = async () => {
    if (paying || subtotal <= 0) {
      return;
    }

    if (paymentItems.length === 0) {
      toast.error("Đơn hàng chưa có sản phẩm");
      return;
    }

    if (isMissingAddress) {
      toast.error("Bạn chưa nhập địa chỉ nhận hàng");
      return;
    }

    if (
      paymentMethod === "zalopay" &&
      !ZALOPAY_ENABLED
    ) {
      toast.error(
        "ZaloPay chưa được kích hoạt cho Mini App này",
      );
      return;
    }

    try {
      setPaying(true);

      const result = await checkout({
        subtotal,
        shippingFee,
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

      /*
       * Không đóng Sheet trước khi Checkout SDK mở xong.
       * Khi SDK hoàn tất, Zalo sẽ chuyển về Redirect Path.
       */
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Thanh toán thất bại";

      console.error("CHECKOUT_ERROR:", error);
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      {/* Thanh tổng tiền phía dưới trang giỏ hàng */}
      <div className="flex-none border-t bg-section px-4 py-3">
        <div className="space-y-3">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-subtitle">
              Tiền sản phẩm
            </span>

            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between gap-4 text-sm">
            <span className="text-subtitle">
              Phí vận chuyển
            </span>

            <span
              className={
                shippingFee === 0
                  ? "font-medium text-green-600"
                  : ""
              }
            >
              {shippingFee === 0
                ? "Miễn phí vận chuyển"
                : formatPrice(shippingFee)}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-sm">
            <span className="text-subtitle">
              Hình thức nhận
            </span>

            <span>
              {isPickup
                ? "Tự đến lấy hàng"
                : "Giao tận nơi"}
            </span>
          </div>

          <div className="flex items-center gap-3 border-t pt-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                Tổng thanh toán
              </div>

              <div className="text-lg font-semibold text-primary">
                {formatPrice(finalTotal)}
              </div>
            </div>

            <Button
              disabled={paying || subtotal <= 0}
              onClick={handleOpenPaymentSheet}
            >
              Thanh toán
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet thanh toán */}
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
        title="Thông tin thanh toán"
      >
        <div
          className="flex min-h-0 flex-col bg-section"
          style={{
            height: "calc(100dvh - 96px)",
            maxHeight: "calc(100dvh - 96px)",
          }}
        >
          {/* Khu vực nội dung cuộn */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-5">
              {/* Hình thức nhận hàng */}
              <section>
                <div className="mb-3 font-medium">
                  Hình thức nhận hàng
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
                          Giao tận nơi
                        </div>

                        <div className="text-xs text-subtitle">
                          Tính phí theo địa chỉ
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
                          Tự đến lấy hàng
                        </div>

                        <div className="text-xs text-green-600">
                          Miễn phí vận chuyển
                        </div>
                      </div>
                    </label>
                  </div>
                </Radio.Group>
              </section>

              {/* Địa chỉ giao hàng */}
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
                      ? "TP. Hồ Chí Minh"
                      : "Tỉnh, thành phố khác"}
                  </div>

                  <div
                    className={`mt-1 break-words text-xs ${
                      isMissingAddress
                        ? "text-red-600"
                        : "text-subtitle"
                    }`}
                  >
                    {shippingAddress?.address?.trim() ||
                      "Chưa có địa chỉ nhận hàng"}
                  </div>
                </section>
              )}

              {/* Phương thức thanh toán */}
              <section>
                <div className="mb-3 font-medium">
                  Phương thức thanh toán
                </div>

                <Radio.Group
                  value={paymentMethod}
                  onChange={(value) =>
                    setPaymentMethod(
                      value as PaymentMethod,
                    )
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
                          Thanh toán khi nhận hàng
                        </div>

                        <div className="text-xs text-subtitle">
                          COD
                        </div>
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
                            Thanh toán qua ZaloPay
                          </div>

                          <div className="text-xs text-subtitle">
                            Thanh toán trực tuyến
                          </div>
                        </div>
                      </label>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-subtitle">
                        ZaloPay đang tạm ẩn. Bật{" "}
                        <strong>
                          VITE_ENABLE_ZALOPAY=true
                        </strong>{" "}
                        sau khi đã cấu hình ZaloPay
                        Merchant Sandbox trong trang quản lý
                        Mini App.
                      </div>
                    )}
                  </div>
                </Radio.Group>
              </section>

              {/* Chi tiết thanh toán */}
              <section className="space-y-3 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between gap-4 text-sm">
                  <span>Tiền sản phẩm</span>

                  <span>
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span>Phí vận chuyển</span>

                  <span>
                    {shippingFee === 0
                      ? "Miễn phí"
                      : formatPrice(shippingFee)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-t pt-3">
                  <span className="font-medium">
                    Tổng thanh toán
                  </span>

                  <span className="text-lg font-semibold text-primary">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </section>

              {/* Cảnh báo thiếu địa chỉ */}
              {isMissingAddress && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  Bạn chưa nhập địa chỉ nhận hàng.
                </div>
              )}

              {/* Thông báo miễn phí vận chuyển */}
              {shippingMethod === "delivery" &&
                subtotal > 0 &&
                subtotal <
                  FREE_SHIPPING_MINIMUM && (
                  <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-700">
                    Mua thêm{" "}
                    {formatPrice(
                      FREE_SHIPPING_MINIMUM -
                        subtotal,
                    )}{" "}
                    để được miễn phí vận chuyển.
                  </div>
                )}

              {!isPickup &&
                isFreeShipping &&
                subtotal >=
                  FREE_SHIPPING_MINIMUM && (
                  <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
                    Đơn hàng đã được miễn phí vận
                    chuyển.
                  </div>
                )}

              {/* Khoảng trống cuối vùng cuộn */}
              <div className="h-2" />
            </div>
          </div>

          {/* Footer cố định: nút luôn hiển thị */}
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
                ? "Đặt hàng COD"
                : "Thanh toán ZaloPay"}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}