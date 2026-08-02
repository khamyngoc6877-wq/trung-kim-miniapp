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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

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
    shippingMethod === "delivery" && !shippingAddress?.address?.trim();
  const isFreeShipping = subtotal > 0 && shippingFee === 0;

  const handleCheckout = async () => {
    if (subtotal <= 0 || paying || isMissingAddress) return;

    try {
      setPaying(true);
      const result = await checkout({
        subtotal,
        shippingFee,
        totalAmount: finalTotal,
        shippingMethod,
        shippingArea: shippingMethod === "delivery" ? shippingArea : undefined,
        shippingAddress:
          shippingMethod === "delivery" ? shippingAddress : undefined,
        paymentMethod,
        items: paymentItems,
      });
      setShowPaymentSheet(false);
      console.log("Checkout result", result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Thanh toán thất bại";
      console.error("CHECKOUT_ERROR", error);
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <div className="flex-none bg-section px-4 py-3">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-subtitle">Tiền sản phẩm</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-subtitle">Phí vận chuyển</span>
            <span className={shippingFee === 0 ? "font-medium text-green-600" : ""}>
              {shippingFee === 0 ? "Miễn phí vận chuyển" : formatPrice(shippingFee)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-subtitle">Hình thức nhận</span>
            <span>{isPickup ? "Tự đến lấy hàng" : "Giao tận nơi"}</span>
          </div>
          <div className="flex items-center border-t pt-3">
            <div className="flex-1">
              <div className="text-sm font-medium">Tổng thanh toán</div>
              <div className="text-lg font-semibold text-primary">
                {formatPrice(finalTotal)}
              </div>
            </div>
            <Button
              disabled={paying || subtotal <= 0}
              onClick={() => setShowPaymentSheet(true)}
            >
              Thanh toán
            </Button>
          </div>
        </div>
      </div>

      <Sheet
        visible={showPaymentSheet}
        onClose={() => !paying && setShowPaymentSheet(false)}
        autoHeight
        mask
        handler
        swipeToClose={!paying}
        title="Thông tin thanh toán"
      >
        <div className="p-4 pb-6">
          <div className="mb-5">
            <div className="mb-3 font-medium">Hình thức nhận hàng</div>
            <Radio.Group
              value={shippingMethod}
              onChange={(value) =>
                setDeliveryMode(value === "delivery" ? "shipping" : "pickup")
              }
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <Radio value="delivery" />
                  <div>
                    <div className="font-medium">Giao tận nơi</div>
                    <div className="text-xs text-subtitle">Tính phí theo địa chỉ</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <Radio value="pickup" />
                  <div>
                    <div className="font-medium">Tự đến lấy hàng</div>
                    <div className="text-xs text-green-600">Miễn phí vận chuyển</div>
                  </div>
                </label>
              </div>
            </Radio.Group>
          </div>

          {shippingMethod === "delivery" && (
            <div className="mb-5 rounded-lg border p-4">
              <div className="font-medium">
                {shippingArea === "hcm" ? "TP. Hồ Chí Minh" : "Tỉnh, thành phố khác"}
              </div>
              <div className="mt-1 text-xs text-subtitle">
                {shippingAddress?.address || "Chưa có địa chỉ nhận hàng"}
              </div>
            </div>
          )}

          <div className="mb-5">
            <div className="mb-3 font-medium">Phương thức thanh toán</div>
            <Radio.Group
              value={paymentMethod}
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <Radio value="cash" />
                  <div>
                    <div className="font-medium">Thanh toán khi nhận hàng</div>
                    <div className="text-xs text-subtitle">COD</div>
                  </div>
                </label>
                {ZALOPAY_ENABLED ? (
                  <label className="flex items-center gap-3 rounded-lg border p-4">
                    <Radio value="zalopay" />
                    <div>
                      <div className="font-medium">Thanh toán qua ZaloPay</div>
                      <div className="text-xs text-subtitle">Thanh toán trực tuyến</div>
                    </div>
                  </label>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-subtitle">
                    ZaloPay đang tạm ẩn. Bật VITE_ENABLE_ZALOPAY=true sau khi đã cấu hình
                    ZaloPay Merchant Sandbox trong trang quản lý Mini App.
                  </div>
                )}
              </div>
            </Radio.Group>
          </div>

          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span>Tiền sản phẩm</span><span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Phí vận chuyển</span>
              <span>{shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-medium">Tổng thanh toán</span>
              <span className="text-lg font-semibold text-primary">
                {formatPrice(finalTotal)}
              </span>
            </div>
          </div>

          {isMissingAddress && (
            <div className="mt-3 text-sm text-red-600">Bạn chưa nhập địa chỉ nhận hàng.</div>
          )}
          {shippingMethod === "delivery" &&
            subtotal > 0 &&
            subtotal < FREE_SHIPPING_MINIMUM && (
              <div className="mt-3 text-xs text-subtitle">
                Mua thêm {formatPrice(FREE_SHIPPING_MINIMUM - subtotal)} để miễn phí vận chuyển.
              </div>
            )}
          {!isPickup && isFreeShipping && subtotal >= FREE_SHIPPING_MINIMUM && (
            <div className="mt-3 text-sm text-green-600">
              Đơn hàng đã được miễn phí vận chuyển.
            </div>
          )}

          <Button
            fullWidth
            className="mt-5"
            loading={paying}
            disabled={paying || subtotal <= 0 || isMissingAddress}
            onClick={handleCheckout}
          >
            {paymentMethod === "cash" ? "Đặt hàng COD" : "Thanh toán ZaloPay"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
