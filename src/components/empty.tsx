import { useTranslation } from "@/hooks/use-translation";
import {
  EmptyBoxIcon,
  EmptyCartIcon,
  SearchIconLarge,
} from "./vectors";

export function EmptySearchResult() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-6">
      <SearchIconLarge />
      <div className="text-center text-2xs text-inactive">
        {t("empty", "search")}
      </div>
    </div>
  );
}

export function EmptyCategory() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center space-y-4 p-6">
      <EmptyBoxIcon />
      <div className="text-center text-2xs text-inactive">
        {t("empty", "category")}
      </div>
    </div>
  );
}

export function EmptyOrder() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center space-y-4 p-6">
      <EmptyBoxIcon />
      <div className="text-center text-2xs text-inactive">
        {t("empty", "order")}
      </div>
    </div>
  );
}

export function EmptyCart() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center space-y-4 p-6">
      <EmptyCartIcon />
      <div className="text-center text-2xs text-inactive">
        {t("empty", "cart")}
      </div>
    </div>
  );
}
