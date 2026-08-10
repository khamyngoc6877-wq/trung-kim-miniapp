import { useRequestInformation } from "@/hooks";
import registerIllusRight from "@/static/register-illus-right.svg";
import { useTranslation } from "@/hooks/use-translation";

export default function Register() {
  const requestInfo = useRequestInformation();
  const { t } = useTranslation();

  return (
    <button
      className="w-full text-left rounded-lg bg-primary text-white p-4 bg-cover space-y-0.5"
      style={{
        backgroundImage: `url(${registerIllusRight})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "bottom right",
        backgroundSize: "auto",
      }}
      onClick={requestInfo}
    >
      <div className="text-lg">{t("profile", "register")}</div>
      <div className="text-2xs">{t("profile", "registerDescription")}</div>
    </button>
  );
}
