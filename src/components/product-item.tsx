import { Product } from "@/types";
import { formatPrice } from "@/utils/format";
import TransitionLink from "./transition-link";
import { useState } from "react";
import { Button } from "zmp-ui";
import { useAddToCart } from "@/hooks";
import QuantityInput from "./quantity-input";
import { useTranslation } from "@/hooks/use-translation";

export interface ProductItemProps { product: Product; replace?: boolean; }

export default function ProductItem(props: ProductItemProps) {
  const [selected, setSelected] = useState(false);
  const { addToCart, cartQuantity } = useAddToCart(props.product);
  const { t } = useTranslation();

  return (
    <div className="flex cursor-pointer flex-col rounded-xl bg-section shadow-[0_10px_24px_#0D0D0D17] group" onClick={() => setSelected(true)}>
      <TransitionLink to={`/product/${props.product.id}`} replace={props.replace} className="p-2 pb-0">
        {({ isTransitioning }) => (<>
          <img src={props.product.image} className="aspect-square w-full rounded-lg object-cover" style={{ viewTransitionName: isTransitioning && selected ? `product-image-${props.product.id}` : undefined }} alt={props.product.name} />
          <div className="pb-1.5 pt-2"><div className="pb-0.5 pt-1"><div className="h-9 line-clamp-2 text-xs">{props.product.name}</div></div><div className="mt-0.5 truncate text-sm font-bold text-primary">{formatPrice(props.product.price)}</div>
          {props.product.originalPrice && <div className="truncate text-3xs space-x-0.5"><span className="text-subtitle line-through">{formatPrice(props.product.originalPrice)}</span><span className="text-danger">-{100-Math.round((props.product.price*100)/props.product.originalPrice)}%</span></div>}</div>
        </>)}
      </TransitionLink>
      <div className="p-2">{cartQuantity===0 ? <Button variant="secondary" size="small" fullWidth onClick={(e)=>{e.stopPropagation();addToCart(1,{toast:true});}}>{t("product","addToCart")}</Button> : <QuantityInput value={cartQuantity} onChange={addToCart}/>}</div>
    </div>
  );
}
