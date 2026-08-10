import { useAtomValue } from "jotai";
import Badge from "./badge";
import { CartIcon } from "./vectors";
import { cartState, cartTotalState } from "@/state";
import { formatPrice } from "@/utils/format";
import TransitionLink from "./transition-link";
import { useRouteHandle } from "@/hooks";
import { useTranslation } from "@/hooks/use-translation";

function FloatingCartPreview() {
  const cart = useAtomValue(cartState);
  const { totalItems, totalAmount } = useAtomValue(cartTotalState);
  const [handle] = useRouteHandle();
  const { t } = useTranslation();

  if (totalItems === 0 || handle?.noFloatingCart) {
    return null;
  }

  return (
    <TransitionLink
      to="/cart"
      className={`fixed left-4 right-4 ${
        handle?.noFooter ? "bottom-6" : "bottom-16"
      } mb-sb flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-left text-primaryForeground`}
    >
      <Badge value={cart.length} style={{ boxShadow: "none" }}>
        <CartIcon mono />
      </Badge>

      <span className="flex-1 text-base font-medium">
        {formatPrice(totalAmount)}
      </span>

      <span className="text-sm">{t("product", "placeOrder")}</span>
    </TransitionLink>
  );
}

export default FloatingCartPreview;
