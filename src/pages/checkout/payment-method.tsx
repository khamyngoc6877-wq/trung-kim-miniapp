import { useAtom } from "jotai";
import { paymentMethodState } from "@/state/payment";
import { useTranslation } from "@/hooks/use-translation";

export default function PaymentMethod() {
  const [paymentMethod, setPaymentMethod] = useAtom(paymentMethodState);
  const { t } = useTranslation();

  return (
    <div className="bg-section px-4 py-3">
      <div className="font-medium mb-2">{t("payment", "paymentMethod")}</div>

      <label className="flex items-start gap-3 py-3 border-b">
        <input
          type="radio"
          name="paymentMethod"
          value="cash"
          checked={paymentMethod === "cash"}
          onChange={() => setPaymentMethod("cash")}
          className="mt-1"
        />
        <div>
          <div className="text-sm font-medium">{t("payment", "cod")}</div>
          <div className="text-xs text-subtitle mt-1">
            {t("payment", "codDescription")}
          </div>
        </div>
      </label>

      <label className="flex items-start gap-3 py-3">
        <input
          type="radio"
          name="paymentMethod"
          value="zalopay"
          checked={paymentMethod === "zalopay"}
          onChange={() => setPaymentMethod("zalopay")}
          className="mt-1"
        />
        <div>
          <div className="text-sm font-medium">{t("payment", "zalopay")}</div>
          <div className="text-xs text-subtitle mt-1">
            {t("payment", "zalopayDescription")}
          </div>
        </div>
      </label>
    </div>
  );
}
