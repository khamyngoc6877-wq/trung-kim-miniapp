import Section from "@/components/section";
import { VoucherIcon } from "@/components/vectors";
import { useToBeImplemented } from "@/hooks";
import { Icon } from "zmp-ui";
import { useTranslation } from "@/hooks/use-translation";

export default function ApplyVoucher() {
  const toBeImplemented = useToBeImplemented();
  const { t } = useTranslation();
  return (
    <Section title={t("cart", "voucherTitle")} className="rounded-lg">
      <button
        className="w-full flex justify-between items-center py-2 px-4 space-x-2 cursor-pointer"
        onClick={toBeImplemented}
      >
        <div className="flex items-center space-x-2">
          <VoucherIcon />
          <div className="text-sm flex-1">{t("common", "voucher")}</div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="text-sm font-medium">{t("common", "choose")}</div>
          <Icon icon="zi-chevron-right" />
        </div>
      </button>
    </Section>
  );
}
