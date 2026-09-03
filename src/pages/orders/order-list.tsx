import { Order } from "@/types";
import {
  Atom,
  useAtomValue,
  useSetAtom,
} from "jotai";
import { loadable } from "jotai/utils";
import {
  useEffect,
  useMemo,
} from "react";
import { EmptyOrder } from "@/components/empty";
import OrderSummary from "./order-summary";
import { OrderSummarySkeleton } from "@/components/skeleton";

function OrderList(props: {
  ordersState: Atom<Promise<Order[]>>;
}) {
  const refreshOrders =
    useSetAtom(
      props.ordersState as any,
    );

  useEffect(() => {
    // atomWithRefresh: gọi setter không tham số
    // để lấy trạng thái mới nhất từ backend mỗi lần mở tab.
    refreshOrders();
  }, [refreshOrders]);

  const orderList =
    useAtomValue(
      useMemo(
        () =>
          loadable(
            props.ordersState,
          ),
        [props.ordersState],
      ),
    );

  if (
    orderList.state === "hasData" &&
    orderList.data.length === 0
  ) {
    return <EmptyOrder />;
  }

  return (
    <div className="space-y-2 p-4">
      {orderList.state !==
      "hasData" ? (
        <>
          <OrderSummarySkeleton />
          <OrderSummarySkeleton />
          <OrderSummarySkeleton />
        </>
      ) : (
        orderList.data.map(
          (order) => (
            <OrderSummary
              key={order.id}
              order={order}
            />
          ),
        )
      )}
    </div>
  );
}

export default OrderList;
