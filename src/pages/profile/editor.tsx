import CONFIG from "@/config";
import { userInfoKeyState, userInfoState } from "@/state";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "zmp-ui";
import { useTranslation } from "@/hooks/use-translation";

function ProfileEditorPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userInfo = useAtomValue(userInfoState);
  const setUserInfoKey = useSetAtom(userInfoKeyState);
  const refreshUserInfo = () => setUserInfoKey((key) => key + 1);

  return (
    <form
      className="h-full flex flex-col justify-between"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const newUserInfo = { ...userInfo };
        data.forEach((value, key) => {
          newUserInfo[key] = value;
        });
        localStorage.setItem(
          CONFIG.STORAGE_KEYS.USER_INFO,
          JSON.stringify(newUserInfo)
        );
        refreshUserInfo();
        toast.success(t("profile", "updated"));
        navigate(-1);
      }}
    >
      <div className="bg-section p-4 grid gap-4">
        <Input name="name" label={t("profile", "fullName")} defaultValue={userInfo?.name} />
        <Input
          name="phone"
          label={t("profile", "phone")}
          required
          defaultValue={userInfo?.phone}
        />
        <Input
          name="email"
          label="Email"
          placeholder="Email"
          defaultValue={userInfo?.email}
        />
        <Input
          name="address"
          label={t("profile", "address")}
          placeholder={t("profile", "addressPlaceholder")}
          defaultValue={userInfo?.address}
        />
      </div>
      <div className="p-6 pt-4 bg-section">
        <Button htmlType="submit" fullWidth>
          {t("common", "save")}
        </Button>
      </div>
    </form>
  );
}

export default ProfileEditorPage;
