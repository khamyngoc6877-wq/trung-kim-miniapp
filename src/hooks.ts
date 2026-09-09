import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MutableRefObject, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { UIMatch, useMatches, useNavigate } from "react-router-dom";
import {
  cartState,
  cartTotalState,
  ordersState,
  userInfoKeyState,
  userInfoState,
} from "@/state";
import { Product, ProductVariant } from "@/types";
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

export function useAddToCart(
  product?: Product,
  variant?: ProductVariant,
) {
  const [cart, setCart] = useAtom(cartState);
  const { t } = useTranslation();

  const getItemKey = (
    itemProduct?: Product,
    itemVariant?: ProductVariant,
  ) => {
    const productId = String(itemProduct?.id ?? "");
    const variantKey = String(
      itemVariant?.id ??
        itemVariant?.sku ??
        itemVariant?.name ??
        "",
    ).trim();

    return `${productId}::${variantKey}`;
  };

  const targetKey = getItemKey(product, variant);

  // Chặn trường hợp một lần bấm nhưng event bị phát 2 lần liên tiếp.
  const lastAddRef = useRef<{ key: string; time: number }>({
    key: "",
    time: 0,
  });

  const currentCartItem = useMemo(() => {
    if (!product) {
      return undefined;
    }

    return cart.find(
      (item) =>
        getItemKey(item.product, item.variant) === targetKey,
    );
  }, [cart, product, variant, targetKey]);

  const addToCart = (
    quantity: number | ((oldQuantity: number) => number),
    options?: { toast: boolean },
  ) => {
    if (!product) {
      return;
    }

    if (variant && Number(variant.stock) <= 0) {
      toast.error("Quy cách này đã hết hàng.");
      return;
    }

    const now = Date.now();
    if (
      lastAddRef.current.key === targetKey &&
      now - lastAddRef.current.time < 350
    ) {
      return;
    }
    lastAddRef.current = {
      key: targetKey,
      time: now,
    };

    setCart((oldCart) => {
      /*
       * Chuẩn hóa giỏ trước khi thêm:
       * - cùng sản phẩm + cùng quy cách => 1 dòng duy nhất
       * - giữ lại tổng số lượng nếu trước đó đã bị tạo trùng
       */
      const merged = new Map<string, (typeof oldCart)[number]>();

      for (const item of oldCart) {
        const key = getItemKey(item.product, item.variant);
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

      const normalizedCart = Array.from(merged.values());
      const existingIndex = normalizedCart.findIndex(
        (item) =>
          getItemKey(item.product, item.variant) === targetKey,
      );

      const oldQuantity =
        existingIndex >= 0
          ? Number(normalizedCart[existingIndex]?.quantity ?? 0)
          : 0;

      /*
       * Khi gọi addToCart(1), số 1 là "thêm 1",
       * không phải "đặt số lượng thành 1".
       */
      const newQuantity =
        typeof quantity === "function"
          ? quantity(oldQuantity)
          : oldQuantity + Number(quantity);

      if (newQuantity <= 0) {
        return normalizedCart.filter(
          (item) =>
            getItemKey(item.product, item.variant) !== targetKey,
        );
      }

      if (existingIndex >= 0) {
        return normalizedCart.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: newQuantity }
            : item,
        );
      }

      const productForCart: Product = variant
        ? {
            ...product,
            price: Number(variant.price),
            originalPrice:
              variant.compareAtPrice !== undefined
                ? Number(variant.compareAtPrice)
                : product.originalPrice,
          }
        : product;

      return [
        ...normalizedCart,
        {
          product: productForCart,
          quantity: newQuantity,
          variant,
        },
      ];
    });

    if (options?.toast) {
      toast.success(t("product", "addedToCart"));
    }
  };

  return {
    addToCart,
    cartQuantity: currentCartItem?.quantity ?? 0,
  };
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
