import HorizontalDivider from "@/components/horizontal-divider";
import Section from "@/components/section";
import { Order } from "@/types";
import { formatPrice } from "@/utils/format";
import CollapsibleOrderItems from "./collapsible-order-items";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/use-translation";

function OrderSummary(props: { order: Order; full?: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Section
      title={
        <div className="w-full flex justify-between items-center space-x-2 font-normal">
          <span className="text-xs truncate">
            {t("common", "receiveTime")}: {t("common", "receiveTimeValue")}
          </span>
          <span
            className={`text-xs ${
              props.order.paymentStatus === "failed"
                ? "text-danger"
                : "text-primary"
            }`}
          >
            {
              {
                pending: t("orders", "waiting"),
                success: t("orders", "paid"),
                failed: t("orders", "paymentFailed"),
              }[props.order.paymentStatus]
            }
          </span>
        </div>
      }
      className="flex-1 overflow-y-auto rounded-lg"
      onClick={() => {
        if (!props.full) {
          navigate(`/order/${props.order.id}`, {
            state: props.order,
            viewTransition: true,
          });
        }
      }}
    >
      <div className="w-full">
        <CollapsibleOrderItems
          items={props.order.items}
          defaultExpanded={props.full}
        />
      </div>
      <HorizontalDivider />
      <div className="flex justify-between items-center px-4 py-2 space-x-4">
        <div className="text-xs">{t("orders", "totalGoods")}</div>
        <div className="text-sm font-medium">
          {formatPrice(props.order.total)}
        </div>
      </div>
    </Section>
  );
}

export default OrderSummary;
