import { atom } from "jotai";
import {
  atomFamily,
  atomWithRefresh,
  atomWithStorage,
  loadable,
  unwrap,
} from "jotai/utils";
import {
  Cart,
  Category,
  Delivery,
  Location,
  Order,
  OrderStatus,
  Product,
  ShippingAddress,
  Station,
  UserInfo,
} from "@/types";
import { requestWithFallback } from "@/utils/request";
import { getLocation } from "zmp-sdk/apis";
import toast from "react-hot-toast";
import { calculateDistance } from "./utils/location";
import { formatDistant } from "./utils/format";
import CONFIG from "./config";
import {
  fetchCustomerOrders,
  type BackendOrder,
} from "@/services/order-history.service";

const PRODUCT_API_URL =
  "https://trung-kim-backend.onrender.com/api/products";

type BackendProductVariant = {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | string | null;
  stock?: number | string | null;
  compareAtPrice?: number | string | null;
};

type BackendProduct = {
  id: string | number;
  sku?: string | null;
  name: string;
  category?: string | number | null;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  stock?: number | string | null;
  description?: string | null;
  specifications?: unknown;
  images?: string[];
  variants?: BackendProductVariant[];
  status?: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function mapBackendProduct(
  product: BackendProduct,
  categories: Category[],
): Product {
  const rawCategoryId = product.category ?? "";
  const numericCategoryId = Number(rawCategoryId);

  const category =
    categories.find(
      (item) => String(item.id) === String(rawCategoryId),
    ) ??
    ({
      id: Number.isFinite(numericCategoryId)
        ? numericCategoryId
        : 0,
      name: String(rawCategoryId ?? ""),
      image: "",
    } satisfies Category);

  const price = toNumber(product.price);
  const compareAtPrice = toNumber(product.compareAtPrice);

  return {
    id: product.id,
    sku: String(product.sku ?? ""),
    name: String(product.name ?? ""),
    price,
    originalPrice:
      compareAtPrice > 0 ? compareAtPrice : undefined,
    stock: toNumber(product.stock),
    image:
      Array.isArray(product.images) && product.images.length > 0
        ? String(product.images[0] ?? "")
        : "",
    category,
    categoryId: rawCategoryId,
    detail: String(product.description ?? ""),
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => {
          const variantCompareAtPrice = toNumber(
            variant.compareAtPrice,
          );

          return {
            id: String(variant.id),
            name: String(variant.name ?? ""),
            sku: variant.sku
              ? String(variant.sku)
              : undefined,
            price: toNumber(variant.price, price),
            stock: toNumber(variant.stock),
            compareAtPrice:
              variantCompareAtPrice > 0
                ? variantCompareAtPrice
                : undefined,
          };
        })
      : [],
  };
}

export const userInfoKeyState = atom(0);

export const userInfoState = atom<Promise<UserInfo | undefined>>(
  async (get) => {
    get(userInfoKeyState);

    const savedUserInfo = localStorage.getItem(
      CONFIG.STORAGE_KEYS.USER_INFO,
    );

    if (!savedUserInfo) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(savedUserInfo) as Partial<UserInfo>;

      if (
        !parsed ||
        typeof parsed !== "object" ||
        !String(parsed.name ?? "").trim() ||
        !String(parsed.phone ?? "").trim()
      ) {
        return undefined;
      }

      // Với thành viên đã đăng ký trước bản cập nhật này,
      // lấy thời điểm từ member id nếu có, nếu không dùng thời điểm hiện tại.
      const memberId = String(parsed.id ?? "").trim();
      const timestampMatch = memberId.match(/^member-(\d+)-/);
      const fallbackRegisteredAt = timestampMatch
        ? new Date(Number(timestampMatch[1]))
        : new Date();

      const registeredAt = parsed.registeredAt
        ? new Date(parsed.registeredAt)
        : fallbackRegisteredAt;

      const pointsExpireAt = parsed.pointsExpireAt
        ? new Date(parsed.pointsExpireAt)
        : (() => {
            const next = new Date(registeredAt);
            next.setFullYear(next.getFullYear() + 1);
            return next;
          })();

      const member: UserInfo = {
        id: memberId || `member-${Date.now()}`,
        name: String(parsed.name ?? "").trim(),
        avatar: String(parsed.avatar ?? ""),
        phone: String(parsed.phone ?? "").trim(),
        email: String(parsed.email ?? "").trim(),
        address: String(parsed.address ?? "").trim(),
        points: Number.isFinite(Number(parsed.points))
          ? Math.max(0, Number(parsed.points))
          : 0,
        registeredAt: registeredAt.toISOString(),
        pointsExpireAt: pointsExpireAt.toISOString(),

        // Giữ lại dữ liệu hội viên do backend/Supabase trả về.
        pointHistory: Array.isArray((parsed as any).pointHistory)
          ? (parsed as any).pointHistory
          : [],
        vouchers: Array.isArray((parsed as any).vouchers)
          ? (parsed as any).vouchers
          : [],
      } as UserInfo;

      // Nâng cấp dữ liệu cũ để lần sau không còn dùng ngày/điểm mẫu.
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_INFO,
        JSON.stringify(member),
      );

      return member;
    } catch (error) {
      console.warn(
        "Không đọc được thông tin thành viên đã lưu:",
        error,
      );
      return undefined;
    }
  },
);

export const loadableUserInfoState = loadable(userInfoState);

export const bannersState = atom(() =>
  requestWithFallback<string[]>("/banners", [])
);

export const tabsState = atom(["Tất cả", "Nam", "Nữ", "Trẻ em"]);

export const selectedTabIndexState = atom(0);

export const categoriesState = atom(() =>
  requestWithFallback<Category[]>("/categories", [])
);

export const categoriesStateUpwrapped = unwrap(
  categoriesState,
  (prev) => prev ?? []
);

export const productsState = atomWithRefresh(async (get) => {
  const categories = await get(categoriesState);

  try {
    // Luôn lấy tồn kho mới nhất từ backend/Supabase khi productsState được refresh.
    // cache: "no-store" tránh Mini App/WebView giữ lại dữ liệu tồn kho cũ.
    const response = await fetch(
      `${PRODUCT_API_URL}?_=${Date.now()}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Không tải được sản phẩm: HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as BackendProduct[];

    if (!Array.isArray(data)) {
      throw new Error("API sản phẩm không trả về mảng dữ liệu.");
    }

    return data
      .filter((product) => product.status !== "inactive")
      .map((product) =>
        mapBackendProduct(product, categories),
      );
  } catch (error) {
    console.warn(
      "Không tải được sản phẩm từ backend, dùng dữ liệu local dự phòng:",
      error,
    );

    const fallbackProducts = await requestWithFallback<
      (Product & { categoryId: string | number })[]
    >("/products", []);

    return fallbackProducts.map((product) => ({
      ...product,
      category:
        categories.find(
          (category) =>
            String(category.id) ===
            String(product.categoryId),
        ) ??
        product.category,
    }));
  }
});

export const flashSaleProductsState = atom((get) => get(productsState));

export const recommendedProductsState = atom((get) => get(productsState));

export const productState = atomFamily(
  (id: string | number) =>
    atom(async (get) => {
      const products = await get(productsState);
      return products.find(
        (product) => String(product.id) === String(id),
      );
    }),
);

export const cartState = atom<Cart>([]);

export const selectedCartItemIdsState = atom<(string | number)[]>([]);

export const cartTotalState = atom((get) => {
  const items = get(cartState);
  return {
    totalItems: items.length,
    totalAmount: items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    ),
  };
});

export const keywordState = atom("");

export const searchResultState = atom(async (get) => {
  const keyword = get(keywordState);
  const products = await get(productsState);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return products.filter((product) =>
    product.name.toLowerCase().includes(keyword.toLowerCase())
  );
});

export const productsByCategoryState = atomFamily((id: string | number) =>
  atom(async (get) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const products = await get(productsState);
    return products.filter((product) => String(product.categoryId) === id);
  })
);

export const stationsState = atom(async () => {
  let location: Location | undefined;
  try {
    const { token } = await getLocation({});
    // Phía tích hợp làm theo hướng dẫn tại https://mini.zalo.me/documents/api/getLocation/ để chuyển đổi token thành thông tin vị trí người dùng ở server.
    // location = await decodeToken(token);

    // Các bước bên dưới để demo chức năng, phía tích hợp có thể bỏ đi sau.
    toast(
      "Đã lấy được token chứa thông tin vị trí người dùng. Phía tích hợp cần decode token này ở server. Giả lập vị trí tại VNG Campus...",
      {
        icon: "ℹ",
        duration: 10000,
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    location = {
      lat: 10.773756,
      lng: 106.689247,
    };
    // End demo
  } catch (error) {
    console.warn(error);
  }

  const stations = await requestWithFallback<Station[]>("/stations", []);
  const stationsWithDistance = stations.map((station) => ({
    ...station,
    distance: location
      ? formatDistant(
          calculateDistance(
            location.lat,
            location.lng,
            station.location.lat,
            station.location.lng
          )
        )
      : undefined,
  }));

  return stationsWithDistance;
});

export const selectedStationIndexState = atom(0);

export const selectedStationState = atom(async (get) => {
  const index = get(selectedStationIndexState);
  const stations = await get(stationsState);
  return stations[index];
});

export const shippingAddressState = atomWithStorage<
  ShippingAddress | undefined
>(CONFIG.STORAGE_KEYS.SHIPPING_ADDRESS, undefined);

function mapBackendOrderStatus(
  order: BackendOrder,
): OrderStatus {
  switch (order.orderStatus) {
    case "confirmed":
      return "confirmed";

    case "shipping":
      return "shipping";

    case "completed":
      return "completed";

    case "cancelled":
      return "cancelled";

    case "new":
    default:
      return "pending";
  }
}

function mapBackendPaymentStatus(
  order: BackendOrder,
): Order["paymentStatus"] {
  if (
    order.paymentStatus === "paid" ||
    order.paymentStatus === "cod_confirmed"
  ) {
    return "success";
  }

  if (order.paymentStatus === "failed") {
    return "failed";
  }

  return "pending";
}

function normalizeShippingAddress(
  value: unknown,
): ShippingAddress | undefined {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  const address =
    value as Partial<ShippingAddress>;

  return {
    alias:
      String(
        address.alias ?? "Địa chỉ nhận hàng",
      ),
    address:
      String(address.address ?? ""),
    name:
      String(address.name ?? ""),
    phone:
      String(address.phone ?? ""),
  };
}

function backendOrderToOrder(
  backendOrder: BackendOrder,
  products: Product[],
): Order {
  const fallbackCategory: Category = {
    id: 0,
    name: "",
    image: "",
  };

  const items = backendOrder.items.map(
    (item) => {
      const productId =
        Number(item.id);

      const existingProduct =
        products.find(
          (product) =>
            String(product.id) ===
            String(item.id),
        );

      const quantity =
        Number(item.quantity) > 0
          ? Number(item.quantity)
          : 1;

      const unitPrice =
        Number(item.amount) /
        quantity;

      return {
        product:
          existingProduct ?? {
            id:
              Number.isFinite(productId)
                ? productId
                : 0,
            name:
              item.name ||
              "Sản phẩm",
            price:
              Number.isFinite(
                unitPrice,
              )
                ? unitPrice
                : 0,
            image: "",
            category:
              fallbackCategory,
          },
        quantity,
      };
    },
  );

  const shippingAddress =
    normalizeShippingAddress(
      backendOrder.shippingAddress,
    );

  const delivery: Delivery =
    backendOrder.shippingMethod ===
      "delivery" &&
    shippingAddress
      ? {
          type: "shipping",
          ...shippingAddress,
        }
      : {
          type: "pickup",
          // Điểm nhận hàng hiện tại của Trung Kim.
          stationId: 1,
        };

  return {
    id: backendOrder.id,
    code: backendOrder.code,
    status:
      mapBackendOrderStatus(
        backendOrder,
      ),
    paymentStatus:
      mapBackendPaymentStatus(
        backendOrder,
      ),
    createdAt:
      new Date(
        backendOrder.createdAt,
      ),
    receivedAt:
      new Date(
        backendOrder.updatedAt ||
          backendOrder.createdAt,
      ),
    items,
    delivery,
    total:
      Number(
        backendOrder.totalAmount,
      ) || 0,
    note:
      backendOrder.paymentMessage ??
      backendOrder.code ??
      "",
  };
}

export const ordersState =
  atomFamily(
    (status: OrderStatus) =>
      atomWithRefresh(
        async (get) => {
          const [
            backendOrders,
            products,
          ] =
            await Promise.all([
              fetchCustomerOrders(),
              get(productsState),
            ]);

          return backendOrders
            .map((order) =>
              backendOrderToOrder(
                order,
                products,
              ),
            )
            .filter(
              (order) =>
                order.status ===
                status,
            );
        },
      ),
  );

export const deliveryModeState = atomWithStorage<Delivery["type"]>(
  CONFIG.STORAGE_KEYS.DELIVERY,
  "shipping"
);
