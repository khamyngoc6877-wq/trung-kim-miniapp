import { useRequestInformation } from "@/hooks";
import registerIllusRight from "@/static/register-illus-right.svg";
import { useTranslation } from "@/hooks/use-translation";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useState } from "react";

export default function Register() {
  const requestInfo = useRequestInformation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await Promise.resolve(requestInfo());

      // Sau khi người dùng cấp quyền/thông tin Zalo,
      // chuyển sang trang thông tin tài khoản để hoàn tất đăng ký.
      navigate("/profile/edit", {
        viewTransition: true,
      });
    } catch (error) {
      console.error("Register member error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể đăng ký thành viên. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      className="w-full text-left rounded-lg bg-primary text-white p-4 bg-cover space-y-0.5 disabled:opacity-60"
      style={{
        backgroundImage: `url(${registerIllusRight})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "bottom right",
        backgroundSize: "auto",
      }}
      onClick={handleRegister}
    >
      <div className="text-lg">
        {loading
          ? "Đang đăng ký..."
          : t("profile", "register")}
      </div>
      <div className="text-2xs">
        {t("profile", "registerDescription")}
      </div>
    </button>
  );
}
