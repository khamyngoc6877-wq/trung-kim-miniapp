import { useAtom } from "jotai";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Input } from "zmp-ui";
import { shippingAddressState } from "@/state/shipping";
import { useTranslation } from "@/hooks/use-translation";

function ShippingAddressPage() {
  const [address, setAddress] = useAtom(shippingAddressState);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const newAddress = {
      alias: String(formData.get("alias") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
    };

    if (!newAddress.address) {
      toast.error(t("address", "required"));
      return;
    }

    setAddress(newAddress);
    toast.success(t("address", "updated"));
    navigate("/cart", { replace: true });
  };

  const handleDelete = () => {
    setAddress(null);
    toast.success(t("address", "deleted"));
    navigate("/cart", { replace: true });
  };

  return (
    <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <div className="grid gap-4 bg-section p-4">
          <Input
            name="alias"
            label={t("address", "alias")}
            placeholder={t("address", "aliasPlaceholder")}
            defaultValue={address?.alias ?? ""}
          />

          <Input
            name="address"
            label={
              <>
                {t("address", "address")} <span className="text-danger">*</span>
              </>
            }
            placeholder={t("address", "addressPlaceholder")}
            required
            defaultValue={address?.address ?? ""}
            onInvalid={(event) => {
              event.currentTarget.setCustomValidity(t("address", "required"));
              event.currentTarget.reportValidity();
            }}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
          />
        </div>

        <div className="mt-2 grid gap-4 bg-section p-4">
          <Input
            name="name"
            label={t("address", "receiverName")}
            placeholder={t("address", "receiverPlaceholder")}
            defaultValue={address?.name ?? ""}
          />

          <Input
            name="phone"
            label={t("address", "phone")}
            placeholder="0912345678"
            defaultValue={address?.phone ?? ""}
          />
        </div>

        {address && (
          <Button
            htmlType="button"
            fullWidth
            className="mt-2 !rounded-none !bg-section !text-danger"
            type="danger"
            prefixIcon={<Icon icon="zi-delete" />}
            onClick={handleDelete}
          >
            {t("address", "deleteAddress")}
          </Button>
        )}
      </div>

      <div
        className="flex-none border-t bg-section px-6 pt-4"
        style={{
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <Button htmlType="submit" fullWidth>
          {t("address", "done")}
        </Button>
      </div>
    </form>
  );
}

export default ShippingAddressPage;
