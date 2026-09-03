import { atom } from "jotai";

export type AppliedVoucher = {
  code: string;
  name: string;
  discountAmount: number;
};

export const appliedVoucherState = atom<AppliedVoucher | null>(null);
