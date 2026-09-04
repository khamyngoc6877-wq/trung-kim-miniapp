import { UserInfoSkeleton } from "@/components/skeleton";
import TransitionLink from "@/components/transition-link";
import {
  loadableUserInfoState,
  userInfoKeyState,
} from "@/state";
import CONFIG from "@/config";
import { useAtomValue, useSetAtom } from "jotai";
import { PropsWithChildren } from "react";
import toast from "react-hot-toast";
import { Icon } from "zmp-ui";

function UserInfo({ children }: PropsWithChildren) {
  const userInfo = useAtomValue(loadableUserInfoState);
  const refreshUserInfo = useSetAtom(userInfoKeyState);

  const handleLogout = () => {
    localStorage.removeItem(
      CONFIG.STORAGE_KEYS.USER_INFO,
    );
    refreshUserInfo((key) => key + 1);
    toast.success("Đã đăng xuất tài khoản thành viên.");
  };

  if (
    userInfo.state === "hasData" &&
    userInfo.data
  ) {
    const { name, avatar, phone } =
      userInfo.data;

    return (
      <>
        <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15">
          <div className="flex items-center space-x-4">
            {avatar ? (
              <img
                className="rounded-full h-10 w-10 object-cover"
                src={avatar}
                alt={name}
              />
            ) : (
              <div className="rounded-full h-10 w-10 bg-[#EBEFF7] flex items-center justify-center">
                <Icon icon="zi-user" />
              </div>
            )}

            <div className="space-y-0.5 flex-1 overflow-hidden">
              <div className="text-lg truncate">
                {name}
              </div>
              <div className="text-sm text-subtitle truncate">
                {phone}
              </div>
            </div>

            <TransitionLink to="/profile/edit">
              <Icon icon="zi-edit-text" />
            </TransitionLink>
          </div>

          <button
            type="button"
            className="mt-3 w-full rounded-lg border border-black/10 py-2 text-sm font-medium text-subtitle"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>

        {children}
      </>
    );
  }

  if (userInfo.state === "loading") {
    return <UserInfoSkeleton />;
  }

  return <Register />;
}

import Register from "./register";

export default UserInfo;
