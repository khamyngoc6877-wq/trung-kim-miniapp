import { useCheckout } from "@/hooks";
import { useAtom, useAtomValue } from "jotai";
import {
  cartState,
  cartTotalState,
  deliveryModeState,
  shippingAddressState,
} from "@/state";
import { formatPrice } from "@/utils/format";
import {
  calculateShippingFee,
  detectShippingArea,
  FREE_SHIPPING_MINIMUM,
  type ShippingMethod,
} from "@/utils/shipping";
import type { PaymentMethod } from "@/types/payment";
import { Button, Radio, Sheet } from "zmp-ui";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

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
    () => calculateShippingFee({ subtotal, area: shippingArea, method: shippingMethod }),
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

  const handleShippingMethodChange = (value: string) => {
    const method = value as ShippingMethod;
    setDeliveryMode(method === "delivery" ? "shipping" : "pickup");
  };

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
        shippingAddress: shippingMethod === "delivery" ? shippingAddress : undefined,
        paymentMethod,
        items: paymentItems,
      });

      setShowPaymentSheet(false);
      toast.success(paymentMethod === "cash" ? "Đặt hàng COD thành công" : "Đã tạo thanh toán ZaloPay");
      console.log("CHECKOUT_RESULT", result);
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
              onClick={() => setShowPaymentSheet(true)}
              disabled={paying || subtotal <= 0}
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
            <Radio.Group value={shippingMethod} onChange={handleShippingMethodChange}>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <Radio value="delivery" />
                  <div className="flex-1">
                    <div className="font-medium">Giao tận nơi</div>
                    <div className="text-xs text-subtitle">Tính phí theo địa chỉ</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <Radio value="pickup" />
                  <div className="flex-1">
                    <div className="font-medium">Tự đến lấy hàng</div>
                    <div className="text-xs text-green-600">Miễn phí vận chuyển</div>
                  </div>
                </label>
              </div>
            </Radio.Group>
          </div>

          {shippingMethod === "delivery" && (
            <div className="mb-5">
              <div className="mb-3 font-medium">Khu vực giao hàng</div>
              {shippingAddress?.address ? (
                <div className="rounded-lg border p-4">
                  <div className="font-medium">
                    {shippingArea === "hcm" ? "TP. Hồ Chí Minh" : "Tỉnh, thành phố khác"}
                  </div>
                  <div className="mt-1 text-xs text-subtitle">{shippingAddress.address}</div>
                </div>
              ) : (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600">
                  Vui lòng thêm địa chỉ nhận hàng.
                </div>
              )}
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
                  <div className="flex-1">
                    <div className="font-medium">Thanh toán khi nhận hàng</div>
                    <div className="text-xs text-subtitle">COD</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <Radio value="zalopay" />
                  <div className="flex-1">
                    <div className="font-medium">Thanh toán qua ZaloPay</div>
                    <div className="text-xs text-subtitle">Thanh toán trực tuyến</div>
                  </div>
                </label>
              </div>
            </Radio.Group>
          </div>

          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span>Tiền sản phẩm</span>
              <span>{formatPrice(subtotal)}</span>
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

          {shippingMethod === "delivery" && subtotal > 0 && subtotal < FREE_SHIPPING_MINIMUM && (
            <div className="mt-3 text-xs text-subtitle">
              Mua thêm <strong>{formatPrice(FREE_SHIPPING_MINIMUM - subtotal)}</strong> để được miễn phí vận chuyển.
            </div>
          )}

          {!isPickup && isFreeShipping && subtotal >= FREE_SHIPPING_MINIMUM && (
            <div className="mt-3 text-sm text-green-600">Đơn hàng được miễn phí vận chuyển.</div>
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
