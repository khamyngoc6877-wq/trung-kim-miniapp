import ProductGrid from "@/components/product-grid";
import Section from "@/components/section";
import { useAtomValue } from "jotai";
import { flashSaleProductsState } from "@/state";
import { useTranslation } from "@/hooks/use-translation";
export default function FlashSales(){ const products=useAtomValue(flashSaleProductsState); const {t}=useTranslation(); return <Section title={t("home","flashSale")}><ProductGrid products={products}/></Section>; }
