import { ShareDecor } from "@/components/vectors";
import { Product } from "@/types";
import { openShareSheet } from "zmp-sdk/apis";
import { Icon } from "zmp-ui";
import { useTranslation } from "@/hooks/use-translation";
export default function ShareButton(props:{product:Product}){ const {t}=useTranslation(); const share=()=>openShareSheet({type:"zmp_deep_link",data:{title:props.product.name,thumbnail:props.product.image,path:`/product/${props.product.id}`}}); return <button className="relative h-10 w-full cursor-pointer overflow-hidden rounded-lg" onClick={share}><div className="absolute inset-0 bg-[var(--zaui-light-button-secondary-background)] opacity-50"/><ShareDecor className="absolute inset-0"/><div className="relative flex space-x-1 p-2 text-sm font-medium text-primary"><div>{t("product","share")}</div><Icon icon="zi-chevron-right"/></div></button>; }
