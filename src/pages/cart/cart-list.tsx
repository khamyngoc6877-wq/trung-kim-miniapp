import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { cartState } from "@/state";
import CartItem from "./cart-item";
import Section from "@/components/section";
import { Icon, Input } from "zmp-ui";
import HorizontalDivider from "@/components/horizontal-divider";
import { useTranslation } from "@/hooks/use-translation";

export default function CartList() {
  const cart = useAtomValue(cartState);
  const { t } = useTranslation();

  const normalizedCart = useMemo(() => {
    const merged = new Map<string, (typeof cart)[number]>();

    for (const item of cart) {
      const variantKey = String(
        item.variant?.id ??
          item.variant?.sku ??
          item.variant?.name ??
          "",
      ).trim();

      const key = `${String(item.product.id)}::${variantKey}`;
      const existing = merged.get(key);

      if (existing) {
        merged.set(key, {
          ...existing,
          quantity:
            Number(existing.quantity || 0) +
            Number(item.quantity || 0),
        });
      } else {
        merged.set(key, { ...item });
      }
    }

    return Array.from(merged.values());
  }, [cart]);

  return (
    <Section
      title={
        <div className="flex items-center space-x-2">
          <Icon icon="zi-calendar" />
          <div>
            <span className="font-normal text-sm">{t("common", "receiveTime")}:</span>{" "}
            <span className="font-medium text-sm">{t("common", "receiveTimeValue")}</span>
          </div>
        </div>
      }
      className="flex-1 overflow-y-auto rounded-lg"
    >
      <div className="w-full">
        {normalizedCart.map((item) => {
          const variantKey = String(
            item.variant?.id ??
              item.variant?.sku ??
              item.variant?.name ??
              "",
          ).trim();

          return (
            <CartItem
              key={`${String(item.product.id)}::${variantKey}`}
              {...item}
            />
          );
        })}
      </div>
      <HorizontalDivider />
      <div className="flex items-center px-4 pt-3 pb-2 space-x-4">
        <div className="text-sm font-medium">{t("common", "note")}</div>
        <input
          type="text"
          placeholder={t("common", "sellerNote")}
          className="text-sm text-right flex-1 focus:outline-none"
        />
      </div>
    </Section>
  );
}
