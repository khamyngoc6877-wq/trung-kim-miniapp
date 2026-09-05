import { pool } from "../lib/db.js";

export type PaymentMethod = "cash" | "zalopay";
export type PaymentStatus = "pending" | "paid" | "failed" | "cod_confirmed";
export type ShippingMethod = "delivery" | "pickup";
export type ShippingArea = "hcm" | "other";
export type OrderStatus = "new" | "confirmed" | "shipping" | "completed" | "cancelled";

export type OrderItem = { id: string; name: string; quantity: number; amount: number };
export type StoreOrder = {
  id:string; code:string; memberId?:string; memberPhone?:string; subtotal:number;
  shippingFee:number; discountAmount?:number; voucherCode?:string; totalAmount:number;
  shippingMethod:ShippingMethod; shippingArea?:ShippingArea; shippingAddress?:unknown;
  items:OrderItem[]; paymentMethod:PaymentMethod; paymentStatus:PaymentStatus;
  orderStatus?:OrderStatus; checkoutOrderId?:string; paymentTransactionId?:string;
  providerMethod?:string; paymentMessage?:string; createdAt:string; updatedAt:string;
};

type Row = any;
const num=(v:any)=>Number(v??0);
const iso=(v:any)=>new Date(v).toISOString();

async function itemsFor(ids:string[]) {
  const m=new Map<string,OrderItem[]>();
  if(!ids.length) return m;
  const r=await pool.query(
    `select order_id,product_id,product_name,quantity,amount
     from public.order_items where order_id=any($1::text[]) order by id`,[ids]);
  for(const x of r.rows){
    const a=m.get(x.order_id)??[];
    a.push({id:x.product_id,name:x.product_name,quantity:num(x.quantity),amount:num(x.amount)});
    m.set(x.order_id,a);
  }
  return m;
}
function map(r:Row, items:OrderItem[]):StoreOrder {
  return {
    id:r.id,code:r.code,memberId:r.member_id??undefined,memberPhone:r.member_phone??undefined,
    subtotal:num(r.subtotal),shippingFee:num(r.shipping_fee),discountAmount:num(r.discount_amount),
    voucherCode:r.voucher_code??undefined,totalAmount:num(r.total_amount),
    shippingMethod:r.shipping_method,shippingArea:r.shipping_area??undefined,
    shippingAddress:r.shipping_address??undefined,items,paymentMethod:r.payment_method,
    paymentStatus:r.payment_status,orderStatus:r.order_status??"new",
    checkoutOrderId:r.checkout_order_id??undefined,
    paymentTransactionId:r.payment_transaction_id??undefined,
    providerMethod:r.provider_method??undefined,paymentMessage:r.payment_message??undefined,
    createdAt:iso(r.created_at),updatedAt:iso(r.updated_at)
  };
}
async function one(column:"id"|"checkout_order_id"|"payment_transaction_id", value:string){
  const v=String(value).trim(); if(!v)return null;
  const r=await pool.query(`select * from public.orders where ${column}=$1 limit 1`,[v]);
  if(!r.rows[0])return null;
  const im=await itemsFor([r.rows[0].id]); return map(r.rows[0],im.get(r.rows[0].id)??[]);
}

export async function saveOrder(o:StoreOrder):Promise<void>{
  const c=await pool.connect();
  try{
    await c.query("begin");
    await c.query(
      `insert into public.orders
      (id,code,member_id,member_phone,subtotal,shipping_fee,discount_amount,voucher_code,
       total_amount,shipping_method,shipping_area,shipping_address,payment_method,payment_status,
       order_status,checkout_order_id,payment_transaction_id,provider_method,payment_message,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       on conflict(id) do update set
       code=excluded.code,member_id=excluded.member_id,member_phone=excluded.member_phone,
       subtotal=excluded.subtotal,shipping_fee=excluded.shipping_fee,discount_amount=excluded.discount_amount,
       voucher_code=excluded.voucher_code,total_amount=excluded.total_amount,
       shipping_method=excluded.shipping_method,shipping_area=excluded.shipping_area,
       shipping_address=excluded.shipping_address,payment_method=excluded.payment_method,
       payment_status=excluded.payment_status,order_status=excluded.order_status,
       checkout_order_id=excluded.checkout_order_id,payment_transaction_id=excluded.payment_transaction_id,
       provider_method=excluded.provider_method,payment_message=excluded.payment_message,updated_at=excluded.updated_at`,
      [o.id,o.code,o.memberId??null,o.memberPhone??null,o.subtotal,o.shippingFee,o.discountAmount??0,
       o.voucherCode??null,o.totalAmount,o.shippingMethod,o.shippingArea??null,
       o.shippingAddress===undefined?null:JSON.stringify(o.shippingAddress),o.paymentMethod,o.paymentStatus,
       o.orderStatus??"new",o.checkoutOrderId??null,o.paymentTransactionId??null,o.providerMethod??null,
       o.paymentMessage??null,o.createdAt,o.updatedAt]);
    await c.query("delete from public.order_items where order_id=$1",[o.id]);
    for(const x of o.items) await c.query(
      `insert into public.order_items(order_id,product_id,product_name,quantity,amount) values($1,$2,$3,$4,$5)`,
      [o.id,String(x.id),x.name,x.quantity,x.amount]);
    await c.query("commit");
  }catch(e){await c.query("rollback");throw e}finally{c.release()}
}

export const findOrderById=(id:string)=>one("id",id);
export async function listOrders():Promise<StoreOrder[]>{
  const r=await pool.query("select * from public.orders order by created_at desc");
  const im=await itemsFor(r.rows.map((x:Row)=>x.id));
  return r.rows.map((x:Row)=>map(x,im.get(x.id)??[]));
}
export async function updateOrderStatus(id:string,status:OrderStatus){
  const r=await pool.query("update public.orders set order_status=$2,updated_at=now() where id=$1 returning *",[String(id).trim(),status]);
  if(!r.rows[0])return null; const im=await itemsFor([r.rows[0].id]); return map(r.rows[0],im.get(r.rows[0].id)??[]);
}
export async function bindCheckoutOrder(merchantOrderId:string,checkoutOrderId:string){
  const r=await pool.query("update public.orders set checkout_order_id=$2,updated_at=now() where id=$1 returning *",
    [String(merchantOrderId).trim(),String(checkoutOrderId).trim()]);
  if(!r.rows[0])throw new Error("Không tìm thấy đơn hàng");
  const im=await itemsFor([r.rows[0].id]); return map(r.rows[0],im.get(r.rows[0].id)??[]);
}
export const findOrderByCheckoutOrderId=(id:string)=>one("checkout_order_id",id);
export const findOrderByTransactionId=(id:string)=>one("payment_transaction_id",id);
export async function updateCodNotify(input:{checkoutOrderId:string;providerMethod:string}){
  const r=await pool.query(
    `update public.orders set payment_status='cod_confirmed',provider_method=$2,
     payment_message='Đơn COD đã được xác nhận',updated_at=now()
     where checkout_order_id=$1 returning *`,
    [String(input.checkoutOrderId).trim(),String(input.providerMethod)]);
  if(!r.rows[0])return null; const im=await itemsFor([r.rows[0].id]); return map(r.rows[0],im.get(r.rows[0].id)??[]);
}
export async function updateOnlinePayment(input:{
  merchantOrderId:string;checkoutOrderId:string;transId:string;providerMethod?:string;message?:string;success:boolean
}){
  const r=await pool.query(
    `update public.orders set checkout_order_id=$2,payment_transaction_id=$3,provider_method=$4,
     payment_message=$5,payment_status=$6,updated_at=now() where id=$1 returning *`,
    [String(input.merchantOrderId).trim(),String(input.checkoutOrderId).trim(),String(input.transId).trim(),
     input.providerMethod??null,input.message??null,input.success?"paid":"failed"]);
  if(!r.rows[0])throw new Error("Không tìm thấy đơn hàng");
  const im=await itemsFor([r.rows[0].id]); return map(r.rows[0],im.get(r.rows[0].id)??[]);
}
