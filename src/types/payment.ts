export type PaymentMethod = "cash" | "zalopay";

export type PaymentItem = {
  id: string;
  amount: number;
};

export type CheckoutOrderResult = {
  orderId: string;
};

export type PendingPayment = {
  merchantOrderId: string;
  paymentMethod: PaymentMethod;
  checkoutOrderId?: string;
  createdAt: number;
};

export type PaymentStatus = "pending" | "paid" | "failed" | "cod_confirmed";

export type StoredOrder = {
  id: string;
  code: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  checkoutOrderId?: string;
  paymentMessage?: string;
  totalAmount: number;
};
