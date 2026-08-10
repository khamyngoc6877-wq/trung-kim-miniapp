import { useAtomValue } from "jotai";
import { cartState } from "@/state";
import { useRouteHandle } from "@/hooks";
import { useTranslation } from "@/hooks/use-translation";
import Badge from "./badge";
import HorizontalDivider from "./horizontal-divider";
import TransitionLink from "./transition-link";
import {
  CartIcon,
  CategoryIcon,
  HomeIcon,
  PackageIcon,
} from "./vectors";

function CartNavIcon(props: Record<string, unknown>) {
  const cart = useAtomValue(cartState);

  return (
    <Badge value={cart.length}>
      <CartIcon {...props} />
    </Badge>
  );
}

export default function Footer() {
  const [handle] = useRouteHandle();
  const { t } = useTranslation();

  if (handle?.noFooter) {
    return null;
  }

  const navItems = [
    { name: t("navigation", "home"), path: "/", icon: HomeIcon },
    { name: t("navigation", "categories"), path: "/categories", icon: CategoryIcon },
    { name: t("navigation", "orders"), path: "/orders", icon: PackageIcon },
    { name: t("navigation", "cart"), path: "/cart", icon: CartNavIcon },
  ];

  return (
    <>
      <HorizontalDivider />
      <div
        className="grid w-full px-4 pt-2 pb-sb"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
      >
        {navItems.map((item) => (
          <TransitionLink
            key={item.path}
            to={item.path}
            className="flex cursor-pointer flex-col items-center space-y-0.5 p-1 pb-0.5 active:scale-105"
          >
            {({ isActive }) => (
              <>
                <div className="flex h-6 w-6 items-center justify-center">
                  <item.icon active={isActive} />
                </div>
                <div className={`text-2xs ${isActive ? "text-primary" : ""}`}>
                  {item.name}
                </div>
              </>
            )}
          </TransitionLink>
        ))}
      </div>
    </>
  );
}
