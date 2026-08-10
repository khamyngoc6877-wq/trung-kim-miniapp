import { useAtomValue } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";
import {
  categoriesStateUpwrapped,
  loadableUserInfoState,
} from "@/state";
import { useMemo } from "react";
import { useRouteHandle } from "@/hooks";
import { getConfig } from "@/utils/template";
import headerIllus from "@/static/header-illus.svg";
import SearchBar from "./search-bar";
import TransitionLink from "./transition-link";
import LanguageSelector from "./language-selector";
import { Icon } from "zmp-ui";
import { DefaultUserAvatar } from "./vectors";
import { useTranslation } from "@/hooks/use-translation";

export default function Header() {
  const categories = useAtomValue(
    categoriesStateUpwrapped,
  );

  const userInfo = useAtomValue(
    loadableUserInfoState,
  );

  const navigate = useNavigate();
  const location = useLocation();

  const routeResult = useRouteHandle();
  const { t } = useTranslation();

  const handle = routeResult?.[0];
  const match = routeResult?.[1];

  const title = useMemo(() => {
    if (!handle) {
      return "";
    }

    if (handle.titleKey) {
      return t("header", handle.titleKey);
    }

    if (typeof handle.title === "function") {
      return handle.title({
        categories,
        params: match?.params ?? {},
      });
    }

    return String(handle.title ?? "");
  }, [
    handle,
    categories,
    match?.params,
    t,
  ]);

  const showBack =
    location.key !== "default" &&
    !handle?.noBack;

  const shopLogo = getConfig(
    (config) => config.template.logoUrl,
  );

  const shopName = getConfig(
    (config) => config.template.shopName,
  );

  const shopAddress = getConfig(
    (config) => config.template.shopAddress,
  );

  return (
    <header
      className="w-full flex-none overflow-hidden bg-primary bg-right-top bg-no-repeat px-4 pt-st text-primaryForeground"
      style={{
        backgroundImage: `url(${headerIllus})`,
      }}
    >
      <div className="flex min-h-12 w-full items-center gap-2 py-2">
        {handle?.logo ? (
          <>
            <img
              src={shopLogo}
              alt={shopName || t("header", "shopLogo")}
              className="h-8 w-8 flex-none rounded-full object-cover"
            />

            <TransitionLink
              to="/stations"
              className="min-w-0 flex-1 overflow-hidden"
            >
              <div className="flex min-w-0 items-center gap-1">
                <h1 className="truncate text-lg font-bold">
                  {shopName}
                </h1>

                <Icon
                  icon="zi-chevron-right"
                  className="flex-none"
                />
              </div>

              <p className="truncate text-2xs">
                {shopAddress}
              </p>
            </TransitionLink>

            <div className="flex-none">
              <LanguageSelector />
            </div>
          </>
        ) : (
          <>
            {showBack && (
              <button
                type="button"
                aria-label={t("header", "back")}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                onClick={() => navigate(-1)}
              >
                <Icon icon="zi-arrow-left" />
              </button>
            )}

            <div className="min-w-0 flex-1 truncate text-xl font-medium">
              {title}
            </div>

            <div className="flex-none">
              <LanguageSelector />
            </div>
          </>
        )}
      </div>

      {handle?.search && (
        <div className="flex w-full items-center gap-2 py-2">
          <div className="min-w-0 flex-1">
            <SearchBar
              onFocus={() => {
                if (
                  location.pathname !== "/search"
                ) {
                  navigate("/search", {
                    viewTransition: true,
                  });
                }
              }}
            />
          </div>

          <TransitionLink
            to="/profile"
            className="flex-none"
          >
            {userInfo.state === "hasData" &&
            userInfo.data ? (
              <img
                className="h-8 w-8 rounded-full object-cover"
                src={userInfo.data.avatar}
                alt={t("header", "avatar")}
              />
            ) : (
              <DefaultUserAvatar
                width={32}
                height={32}
                className={
                  userInfo.state === "loading"
                    ? "animate-pulse"
                    : ""
                }
              />
            )}
          </TransitionLink>
        </div>
      )}
    </header>
  );
}