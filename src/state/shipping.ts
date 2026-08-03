import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type DeliveryMode = "shipping" | "pickup";

export type ShippingAddress = {
  alias: string;
  address: string;
  name: string;
  phone: string;
};

export type SelectedStation = {
  id?: string | number;
  name: string;
  address: string;
};

export const deliveryModeState =
  atomWithStorage<DeliveryMode>(
    "delivery-mode",
    "shipping",
  );

export const shippingAddressState =
  atomWithStorage<ShippingAddress | null>(
    "shipping-address",
    null,
  );

export const selectedStationState =
  atom<SelectedStation>({
    id: "trung-kim",
    name: "Ngũ Kim Trung Kim",
    address:
      "Thửa đất số 2498, tờ bản đồ số 5, Ấp Bình Tả 1, xã Đức Hòa, tỉnh Tây Ninh",
  });