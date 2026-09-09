import OrderList from "./order-list";
import { ordersState } from "@/state";
import { OrderStatus } from "@/types";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/use-translation";

const statuses: OrderStatus[] = ["pending","confirmed","shipping","completed","cancelled"];

function OrdersPage() {
  const { status } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const activeStatus: OrderStatus = statuses.includes(status as OrderStatus)
    ? (status as OrderStatus) : "pending";

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b overflow-x-auto shrink-0">
        <div className="flex min-w-max px-2">
          {statuses.map((item) => {
            const active = activeStatus === item;
            return (
              <button key={item} type="button"
                onClick={() => navigate(`/orders/${item}`)}
                className={`relative whitespace-nowrap px-5 py-3 text-sm transition-colors ${active ? "text-primary font-medium" : "text-subtitle"}`}>
                {t("orders", item)}
                {active && <span className="absolute left-4 right-4 bottom-0 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <OrderList ordersState={ordersState(activeStatus)} />
      </div>
    </div>
  );
}
export default OrdersPage;
