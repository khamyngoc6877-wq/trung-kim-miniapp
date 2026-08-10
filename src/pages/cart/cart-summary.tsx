import { useAtomValue } from "jotai";
import { cartTotalState } from "@/state";
import { formatPrice } from "@/utils/format";
import Section from "@/components/section";
import { useTranslation } from "@/hooks/use-translation";
import HorizontalDivider from "@/components/horizontal-divider";

export default function CartSummary() {
  const { t } = useTranslation();
  const { totalAmount } = useAtomValue(cartTotalState);

  return (
    <Section title={t("cart", "payment")} className="rounded-lg">
      <div className="px-4 py-2 space-y-4">
        <table className="table w-full text-sm [&_th]:text-left [&_th]:text-xs [&_th]:text-inactive [&_th]:font-medium [&_td]:text-right">
          <tbody>
            <tr>
              <th>{t("cart", "subtotal")}</th>
              <td>{formatPrice(totalAmount)}</td>
            </tr>
            <tr>
              <th>{t("cart", "shippingFee")}</th>
              <td>0 VND</td>
            </tr>
          </tbody>
        </table>
        <HorizontalDivider />
        <div className="flex justify-between font-medium text-sm">
          <div>{t("cart", "total")}</div>
          <div>{formatPrice(totalAmount)}</div>
        </div>
      </div>
    </Section>
  );
}
