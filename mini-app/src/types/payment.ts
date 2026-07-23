export type PaymentMethod = "cash" | "zalopay";

export type PaymentItem = {
  id: string;
  amount: number;
  name?: string;
  quantity?: number;
};
