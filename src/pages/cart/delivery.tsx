import { Suspense } from "react";
import { useAtom, useAtomValue } from "jotai";
import HorizontalDivider from "@/components/horizontal-divider";
import Section from "@/components/section";
import { StationSkeleton } from "@/components/skeleton";
import TransitionLink from "@/components/transition-link";
import {
  HomeIcon,
  LocationMarkerLineIcon,
  LocationMarkerPackageIcon,
  PackageDeliveryIcon,
  PlusIcon,
  ShipperIcon,
} from "@/components/vectors";
import {
  deliveryModeState,
  selectedStationState,
  shippingAddressState,
} from "@/state/shipping";
import { useTranslation } from "@/hooks/use-translation";
import DeliverySummary from "./delivery-summary";

function ShippingAddressSummary() {
  const shippingAddress = useAtomValue(shippingAddressState);
  const { t } = useTranslation();

  if (!shippingAddress || !shippingAddress.address?.trim()) {
    return (
      <TransitionLink
        className="flex w-full flex-col items-center justify-center space-y-2 p-4"
        to="/shipping-address"
      >
        <LocationMarkerPackageIcon />
        <div className="flex items-center space-x-1 p-2 text-center">
          <PlusIcon width={16} height={16} />
          <span className="text-sm font-medium">
            {t("cart", "addAddress")}
          </span>
        </div>
      </TransitionLink>
    );
  }

  return (
    <DeliverySummary
      icon={<LocationMarkerLineIcon />}
      title={t("cart", "shippingAddress")}
      subtitle={
        shippingAddress.alias?.trim() ||
        shippingAddress.name?.trim() ||
        t("cart", "shippingAddress")
      }
      description={shippingAddress.address}
      linkTo="/shipping-address"
    />
  );
}

function SelectedStationSummary() {
  const selectedStation = useAtomValue(selectedStationState);
  const { t } = useTranslation();

  return (
    <DeliverySummary
      icon={<HomeIcon />}
      title={t("cart", "receiveAt")}
      subtitle={selectedStation.name}
      description={selectedStation.address}
      linkTo="/stations"
    />
  );
}

export default function Delivery() {
  const [selectedDeliveryMode, setSelectedDeliveryMode] =
    useAtom(deliveryModeState);
  const { t } = useTranslation();

  const options = [
    {
      type: "shipping" as const,
      name: t("cart", "delivery"),
      icon: <ShipperIcon />,
    },
    {
      type: "pickup" as const,
      name: t("cart", "pickup"),
      icon: <PackageDeliveryIcon />,
    },
  ];

  return (
    <Section title={t("cart", "shippingMethod")} className="rounded-lg">
      <div className="grid grid-cols-2 gap-4 p-4 pt-2">
        {options.map((option) => (
          <button
            key={option.type}
            type="button"
            className={`flex h-12 items-center justify-center space-x-2 rounded-full bg-background px-3.5 text-base font-medium ${
              selectedDeliveryMode === option.type
                ? "border border-primary text-primary"
                : ""
            }`}
            onClick={() => setSelectedDeliveryMode(option.type)}
          >
            {option.icon}
            <span>{option.name}</span>
          </button>
        ))}
      </div>

      <HorizontalDivider />

      {selectedDeliveryMode === "shipping" ? (
        <ShippingAddressSummary />
      ) : (
        <Suspense fallback={<StationSkeleton />}>
          <SelectedStationSummary />
        </Suspense>
      )}
    </Section>
  );
}
