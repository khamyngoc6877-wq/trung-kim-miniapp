import { StationSkeleton } from "@/components/skeleton";
import { selectedStationIndexState, stationsState } from "@/state";
import type { Station } from "@/types";
import { getConfig } from "@/utils/template";
import { useAtomValue, useSetAtom } from "jotai";
import { Suspense } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/use-translation";

function Station({
  station,
  phone,
  email,
  onSelect,
}: {
  station: Station & { distance?: string };
  phone?: string;
  email?: string;
  onSelect: () => void;
}) {
  return (
    <button
      className="flex w-full items-start space-x-4 rounded-lg bg-section p-4 pr-2 text-left"
      onClick={onSelect}
    >
      <img
        src={station.image}
        alt={station.name}
        className="h-14 w-14 flex-none rounded-lg bg-skeleton object-cover"
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-sm font-medium">
          {station.name}
        </div>

        <div className="text-xs leading-5 text-inactive">
          {station.address}
        </div>

        {phone && (
          <div className="text-xs text-inactive">
            Điện thoại: {phone}
          </div>
        )}

        {email && (
          <div className="break-all text-xs text-inactive">
            Email: {email}
          </div>
        )}

        {station.distance && (
          <div className="text-xs text-primary">
            {station.distance}
          </div>
        )}
      </div>
    </button>
  );
}

function Stations() {
  const stations = useAtomValue(stationsState);
  const setSelectedStation = useSetAtom(
    selectedStationIndexState,
  );
  const navigate = useNavigate();
  const { t } = useTranslation();

  const phone = getConfig(
    (config) => config.template.phone,
  );

  const email = getConfig(
    (config) => config.template.email,
  );

  return stations.map((station, i) => (
    <Station
      key={station.id}
      station={station}
      phone={phone}
      email={email}
      onSelect={() => {
        setSelectedStation(i);
        toast.success(
          t("common", "stationChanged"),
        );
        navigate(-1);
      }}
    />
  ));
}

function StationsPage() {
  return (
    <div className="flex flex-col space-y-2 p-4">
      <Suspense
        fallback={
          <>
            <StationSkeleton />
            <StationSkeleton />
            <StationSkeleton />
            <StationSkeleton />
          </>
        }
      >
        <Stations />
      </Suspense>
    </div>
  );
}

export default StationsPage;
