import { HomeIcon, LocationMarkerLineIcon } from "@/components/vectors";
import { Order } from "@/types";
import { Icon, List } from "zmp-ui";
import DeliverySummary from "../cart/delivery-summary";
import { useTranslation } from "@/hooks/use-translation";

function OrderInfo(props: { order: Order }) {
  const { t } = useTranslation();
  return (
    <List noSpacing className="bg-section rounded-lg">
      {props.order.delivery.type === "pickup" ? (
        <DeliverySummary
          icon={<HomeIcon />}
          title={t("orders", "deliverTo")}
          subtitle={`#${props.order.delivery.stationId}`}
        />
      ) : (
        <DeliverySummary
          icon={<LocationMarkerLineIcon />}
          title={t("orders", "deliverTo")}
          subtitle={props.order.delivery.alias}
          description={props.order.delivery.address}
        />
      )}
      {props.order.note && (
        <List.Item prefix={<Icon icon="zi-note" />} title={t("common", "note")}>
          <span className="text-xs text-inactive">{props.order.note}</span>
        </List.Item>
      )}
    </List>
  );
}

export default OrderInfo;
