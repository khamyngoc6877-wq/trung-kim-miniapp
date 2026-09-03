import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MutableRefObject, useLayoutEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { UIMatch, useMatches, useNavigate } from "react-router-dom";
import {
  cartState,
  cartTotalState,
  ordersState,
  userInfoKeyState,
  userInfoState,
} from "@/state";
import { Product } from "@/types";
import { getConfig } from "@/utils/template";
import { authorize, createOrder, openChat } from "zmp-sdk/apis";
import { useAtomCallback } from "jotai/utils";
import { useTranslation } from "@/hooks/use-translation";

export function useRealHeight(
  element: MutableRefObject<HTMLDivElement | null>,
  defaultValue?: number
) {
  const [height, setHeight] = useState(defaultValue ?? 0);
  useLayoutEffect(() => {
    if (element.current && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        const [{ contentRect }] = entries;
        setHeight(contentRect.height);
      });
      ro.observe(element.current);
      return () => ro.disconnect();
    }
    return () => {};
  }, [element.current]);

  if (typeof ResizeObserver === "undefined") {
    return -1;
  }
  return height;
}

export function useRequestInformation() {
  const getStoredUserInfo = useAtomCallback(async (get) => {
    try {
      return await get(userInfoState);
    } catch (error) {
      console.warn("Read user info before authorize failed:", error);
      return undefined;
    }
  });

  const setInfoKey = useSetAtom(userInfoKeyState);

  const refreshPermissions = () => {
    setInfoKey((key) => key + 1);
  };

  return async () => {
    // Nếu đã có thông tin người dùng thì dùng luôn.
    const currentUserInfo = await getStoredUserInfo();

    if (currentUserInfo) {
      return currentUserInfo;
    }

    try {
      // Quyền thông tin cơ bản là quyền bắt buộc để đăng ký thành viên.
      await authorize({
        scopes: ["scope.userInfo"],
      });

      // Số điện thoại là quyền bổ sung.
      // Nếu khách từ chối số điện thoại thì vẫn cho phép tiếp tục đăng ký.
      try {
        await authorize({
          scopes: ["scope.userPhonenumber"],
        });
      } catch (phoneError) {
        console.warn(
          "User did not grant phone number permission:",
          phoneError,
        );
      }

      refreshPermissions();

      // Cho state cập nhật lại permission trước khi đọc lại thông tin.
      await new Promise((resolve) =>
        setTimeout(resolve, 150),
      );

      const userInfo = await getStoredUserInfo();

      if (!userInfo) {
        throw new Error(
          "Không lấy được thông tin Zalo. Vui lòng cấp quyền thông tin cá nhân rồi thử lại.",
        );
      }

      return userInfo;
    } catch (error) {
      console.error(
        "Request member information failed:",
        error,
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        "Không thể lấy quyền thông tin Zalo. Vui lòng thử lại.",
      );
    }
  };
}

export function useAddToCart(product: Product) {
  const [cart, setCart] = useAtom(cartState);
  const { t } = useTranslation();

  const currentCartItem = useMemo(
    () => cart.find((item) => item.product.id === product.id),
    [cart, product.id]
  );

  const addToCart = (
    quantity: number | ((oldQuantity: number) => number),
    options?: { toast: boolean }
  ) => {
    setCart((cart) => {
      const newQuantity =
        typeof quantity === "function"
          ? quantity(currentCartItem?.quantity ?? 0)
          : quantity;
      if (newQuantity <= 0) {
        cart.splice(cart.indexOf(currentCartItem!), 1);
      } else {
        if (currentCartItem) {
          currentCartItem.quantity = newQuantity;
        } else {
          cart.push({
            product,
            quantity: newQuantity,
          });
        }
      }
      return [...cart];
    });
    if (options?.toast) {
      toast.success(t("product", "addedToCart"));
    }
  };

  return { addToCart, cartQuantity: currentCartItem?.quantity ?? 0 };
}

export function useCustomerSupport() {
  return () =>
    openChat({
      type: "oa",
      id: getConfig((config) => config.template.oaIDtoOpenChat),
    });
}

export function useToBeImplemented() {
  const { t } = useTranslation();
  return () =>
    toast(t("misc", "featurePending"), {
      icon: "🛠️",
    });
}

export function useCheckout() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const { t } = useTranslation();
  const [cart, setCart] = useAtom(cartState);
  const requestInfo = useRequestInformation();
  const navigate = useNavigate();
  const refreshNewOrders = useSetAtom(ordersState("pending"));

  return async () => {
    try {
      await requestInfo();
      await createOrder({
        amount: totalAmount,
        mac: "",
        desc: t("misc", "paymentDescription"),
        item: cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        })),
      });
      setCart([]);
      refreshNewOrders();
      navigate("/orders", {
        viewTransition: true,
      });
      toast.success(t("misc", "legacyPaymentSuccess"), {
        icon: "🎉",
        duration: 5000,
      });
    } catch (error) {
      console.warn(error);
      toast.error(
        t("misc", "legacyPaymentFailed")
      );
    }
  };
}

export function useRouteHandle() {
  const matches = useMatches() as UIMatch<
    undefined,
    | {
        title?: string | Function;
        titleKey?: string;
        logo?: boolean;
        search?: boolean;
        noFooter?: boolean;
        noBack?: boolean;
        noFloatingCart?: boolean;
        scrollRestoration?: number;
      }
    | undefined
  >[];
  const lastMatch = matches[matches.length - 1];

  return [lastMatch.handle, lastMatch, matches] as const;
}
