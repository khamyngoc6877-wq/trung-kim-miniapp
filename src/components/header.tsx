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

export default function Header() {
  const categories = useAtomValue(categoriesStateUpwrapped);
  const navigate = useNavigate();
  const location = useLocation();
  const [handle, match] = useRouteHandle();
  const userInfo = useAtomValue(loadableUserInfoState);

  const title = useMemo(() => {
    if (!handle) {
      return "";
    }

    if (typeof handle.title === "function") {
      return handle.title({
        categories,
        params: match.params,
      });
    }

    return handle.title ?? "";
  }, [handle, categories, match.params]);

  const showBack =
    location.key !== "default" &&
    !handle?.noBack;

  return (
    <header
      className="w-full flex-none overflow-hidden bg-primary bg-right-top bg-no-repeat px-4 pt-st text-primaryForeground"
      style={{
        backgroundImage: `url(${headerIllus})`,
      }}
    >
      {/* Dòng tiêu đề chính */}
      <div className="flex min-h-12 w-full items-center gap-2 py-2">
        {handle?.logo ? (
          <>
            {/* Logo cửa hàng */}
            <img
              src={getConfig(
                (config) =>
                  config.template.logoUrl,
              )}
              alt={getConfig(
                (config) =>
                  config.template.shopName,
              )}
              className="h-8 w-8 flex-none rounded-full object-cover"
            />

            {/* Tên và địa chỉ cửa hàng */}
            <TransitionLink
              to="/stations"
              className="min-w-0 flex-1 overflow-hidden"
            >
              <div className="flex min-w-0 items-center gap-1">
                <h1 className="truncate text-lg font-bold">
                  {getConfig(
                    (config) =>
                      config.template.shopName,
                  )}
                </h1>

                <Icon
                  icon="zi-chevron-right"
                  className="flex-none"
                />
              </div>

              <p className="truncate text-2xs">
                {getConfig(
                  (config) =>
                    config.template.shopAddress,
                )}
              </p>
            </TransitionLink>

            {/* Nút đổi ngôn ngữ */}
            <div className="flex-none">
              <LanguageSelector />
            </div>
          </>
        ) : (
          <>
            {/* Nút quay lại */}
            {showBack && (
              <button
                type="button"
                aria-label="Quay lại"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                onClick={() => navigate(-1)}
              >
                <Icon icon="zi-arrow-left" />
              </button>
            )}

            {/* Tiêu đề trang */}
            <div className="min-w-0 flex-1 truncate text-xl font-medium">
              {title}
            </div>

            {/* Nút đổi ngôn ngữ */}
            <div className="flex-none">
              <LanguageSelector />
            </div>
          </>
        )}
      </div>

      {/* Thanh tìm kiếm và avatar */}
      {handle?.search && (
        <div className="flex w-full items-center gap-2 py-2">
          <div className="min-w-0 flex-1">
            <SearchBar
              onFocus={() => {
                if (
                  location.pathname !==
                  "/search"
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
                alt="Ảnh đại diện"
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