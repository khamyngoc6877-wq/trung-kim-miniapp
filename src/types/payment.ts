export type PaymentMethod = "cash" | "zalopay";

export type PaymentItem = {
  id: string;
  name?: string;
  quantity?: number;
  amount: number;
};
