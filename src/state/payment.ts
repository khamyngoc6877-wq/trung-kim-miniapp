import { atom } from "jotai";
import type { PaymentMethod } from "@/types/payment";

export const paymentMethodState = atom<PaymentMethod>("cash");
