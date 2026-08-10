import { Tabs } from "zmp-ui";
import OrderList from "./order-list";
import { ordersState } from "@/state";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/use-translation";

function OrdersPage() {
  const { status } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Tabs
      className="h-full flex flex-col"
      activeKey={status}
      onChange={(status) => navigate(`/orders/${status}`)}
    >
      <Tabs.Tab key="pending" label={t("orders", "pending")}>
        <OrderList ordersState={ordersState("pending")} />
      </Tabs.Tab>
      <Tabs.Tab key="shipping" label={t("orders", "shipping")}>
        <OrderList ordersState={ordersState("shipping")} />
      </Tabs.Tab>
      <Tabs.Tab key="completed" label={t("orders", "history")}>
        <OrderList ordersState={ordersState("completed")} />
      </Tabs.Tab>
    </Tabs>
  );
}

export default OrdersPage;
