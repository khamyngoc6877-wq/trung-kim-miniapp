import Section from "@/components/section";
import { VoucherIcon } from "@/components/vectors";
import { useTranslation } from "@/hooks/use-translation";
import { cartTotalState } from "@/state";
import { appliedVoucherState } from "@/state/voucher";
import { validateVoucher } from "@/services/voucher.service";
import { formatPrice } from "@/utils/format";
import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Icon, Sheet } from "zmp-ui";

export default function ApplyVoucher() {
  const { t } = useTranslation();
  const { totalAmount: subtotal } = useAtomValue(cartTotalState);
  const [appliedVoucher, setAppliedVoucher] = useAtom(appliedVoucherState);
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState(appliedVoucher?.code ?? "");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      toast.error("Vui lòng nhập mã voucher");
      return;
    }
    if (subtotal <= 0) {
      toast.error("Giỏ hàng đang trống");
      return;
    }

    try {
      setLoading(true);
      const result = await validateVoucher(normalized, subtotal);
      setAppliedVoucher({
        code: result.voucher?.code ?? normalized,
        name: result.voucher?.name ?? normalized,
        discountAmount: result.discountAmount,
      });
      toast.success("Áp dụng voucher thành công");
      setVisible(false);
    } catch (error) {
      setAppliedVoucher(null);
      toast.error(error instanceof Error ? error.message : "Voucher không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedVoucher(null);
    setCode("");
    toast.success("Đã bỏ voucher");
  };

  return (
    <>
      <Section title={t("cart", "voucherTitle")} className="rounded-lg">
        <button
          type="button"
          className="w-full flex justify-between items-center py-2 px-4 space-x-2 cursor-pointer"
          onClick={() => setVisible(true)}
        >
          <div className="flex items-center space-x-2">
            <VoucherIcon />
            <div className="text-sm flex-1">
              {appliedVoucher
                ? `${appliedVoucher.code} · -${formatPrice(appliedVoucher.discountAmount)}`
                : t("common", "voucher")}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="text-sm font-medium">
              {appliedVoucher ? "Đổi" : t("common", "choose")}
            </div>
            <Icon icon="zi-chevron-right" />
          </div>
        </button>
      </Section>

      <Sheet
        visible={visible}
        onClose={() => setVisible(false)}
        title="Chọn voucher"
        mask
        handler
      >
        <div className="p-4 space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium">Mã voucher</div>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Ví dụ: TRUNGKIM10"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-primary"
            />
          </div>

          {appliedVoucher && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Đang áp dụng {appliedVoucher.code}: giảm{" "}
              {formatPrice(appliedVoucher.discountAmount)}
            </div>
          )}

          <Button fullWidth loading={loading} onClick={handleApply}>
            Áp dụng
          </Button>

          {appliedVoucher && (
            <Button fullWidth variant="secondary" onClick={handleRemove}>
              Bỏ voucher
            </Button>
          )}
        </div>
      </Sheet>
    </>
  );
}
