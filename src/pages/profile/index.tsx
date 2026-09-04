import ProfileActions from "./actions";
import FollowOA from "./follow-oa";
import Points from "./points";
import UserInfo from "./user-info";
import { refreshMember } from "@/services/member.service";
import { userInfoKeyState } from "@/state";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

export default function ProfilePage() {
  const refreshUserInfo = useSetAtom(userInfoKeyState);

  useEffect(() => {
    let cancelled = false;

    void refreshMember()
      .then((member) => {
        if (!cancelled && member) {
          refreshUserInfo((key) => key + 1);
        }
      })
      .catch((error) => {
        console.warn("Không đồng bộ được điểm thành viên:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshUserInfo]);

  return (
    <div className="min-h-full bg-background p-4 space-y-2.5">
      <UserInfo>
        <Points />
      </UserInfo>
      <ProfileActions />
      <FollowOA />
    </div>
  );
}
