import { useAtom } from "jotai";
import { paymentMethodState } from "@/state";

export default function PaymentMethod() {
  const [paymentMethod, setPaymentMethod] =
    useAtom(paymentMethodState);

  return (
    <div className="bg-section px-4 py-3">
      <div className="font-medium mb-2">
        Phương thức thanh toán
      </div>

      <label className="flex items-start gap-3 py-3 border-b">
        <input
          type="radio"
          name="paymentMethod"
          value="COD"
          checked={paymentMethod === "COD"}
          onChange={() => setPaymentMethod("COD")}
          className="mt-1"
        />

        <div>
          <div className="text-sm font-medium">
            Thanh toán khi nhận hàng
          </div>

          <div className="text-xs text-subtitle mt-1">
            Thanh toán tiền mặt cho nhân viên giao hàng
          </div>
        </div>
      </label>

      <label className="flex items-start gap-3 py-3">
        <input
          type="radio"
          name="paymentMethod"
          value="ZALOPAY"
          checked={paymentMethod === "ZALOPAY"}
          onChange={() =>
            setPaymentMethod("ZALOPAY")
          }
          className="mt-1"
        />

        <div>
          <div className="text-sm font-medium">
            Thanh toán qua ZaloPay
          </div>

          <div className="text-xs text-subtitle mt-1">
            Thanh toán trực tuyến bằng ứng dụng ZaloPay
          </div>
        </div>
      </label>
    </div>
  );
}