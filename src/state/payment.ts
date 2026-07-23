import { atom } from "jotai";

export type PaymentMethod = "COD" | "ZALOPAY";

export const paymentMethodState =
  atom<PaymentMethod>("COD");