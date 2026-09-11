import { StationSkeleton } from "@/components/skeleton";
import { stationsState } from "@/state";
import { useAtomValue } from "jotai";
import { Suspense } from "react";
import { useTranslation } from "@/hooks/use-translation";

function CustomerServiceCard() {
  const stations = useAtomValue(stationsState);
  const { t } = useTranslation();

  // Giữ nguyên hình đang dùng ở trang "Điểm nhận hàng" cũ.
  const image = stations?.[0]?.image;

  return (
    <div className="rounded-xl bg-section p-4 shadow-sm">
      <div className="flex items-start gap-4">
        {image && (
          <img
            src={image}
            alt={t("customerService", "companyName")}
            className="h-24 w-24 flex-none rounded-lg bg-skeleton object-contain"
          />
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-6">
            {t("customerService", "companyName")}
          </h2>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-6">
        <div>
          <span className="font-medium">
            {t("customerService", "taxCode")}:
          </span>{" "}
          <span>1102160854</span>
        </div>

        <div>
          <span className="font-medium">
            {t("customerService", "address")}:
          </span>{" "}
          <span>{t("customerService", "addressValue")}</span>
        </div>

        <div>
          <span className="font-medium">
            {t("customerService", "phone")}:
          </span>{" "}
          <a href="tel:0358518816" className="text-primary">
            0358518816
          </a>
        </div>

        <div>
          <span className="font-medium">
            {t("customerService", "email")}:
          </span>{" "}
          <a
            href="mailto:trungkim160854@gmail.com"
            className="break-all text-primary"
          >
            trungkim160854@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StationsPage() {
  return (
    <div className="p-4">
      <Suspense fallback={<StationSkeleton />}>
        <CustomerServiceCard />
      </Suspense>
    </div>
  );
}
