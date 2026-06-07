/**
 * DriverStandings — F1 drivers championship with premium DriverCard.
 * Broadcast Premium: pk-gold/silver/bronze podium, team-color accents, driver portraits.
 *
 * Fetches admin-uploaded photos (dark/light) from the internal API and
 * enriches the Ergast standings data with high-res driver portraits.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getTeamColor, DRIVER_ID_MAP } from "./championshipUtils";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";
import { DriverCard } from "@/components/DriverCard";
import { resolveDriverPhotoUrl } from "@/lib/driverPhotos";
import { api } from "@/lib/api";

interface DriverEntry {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    permanentNumber?: string;
  };
  Constructors?: Array<{
    constructorId: string;
    name: string;
  }>;
}

interface DriverStandingsProps {
  driversStandings: DriverEntry[];
}

export default function DriverStandings({ driversStandings }: DriverStandingsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fetch admin-uploaded driver photos (dark/light) from internal API
  const { data: internalDrivers } = useQuery({
    queryKey: ["drivers", "all-photos"],
    queryFn: () => api.drivers.all(),
    staleTime: 5 * 60 * 1000,
  });

  // Build a lookup map: driver id → { photo_url, photo_url_dark, photo_url_light }
  const photoMap = useMemo(() => {
    if (!internalDrivers)
      return new Map<
        string,
        { photo_url?: string; photo_url_dark?: string; photo_url_light?: string }
      >();
    const map = new Map<
      string,
      { photo_url?: string; photo_url_dark?: string; photo_url_light?: string }
    >();
    for (const d of internalDrivers as Array<{
      id: string;
      photo_url?: string;
      photo_url_dark?: string;
      photo_url_light?: string;
    }>) {
      map.set(d.id, {
        photo_url: d.photo_url,
        photo_url_dark: d.photo_url_dark,
        photo_url_light: d.photo_url_light,
      });
    }
    return map;
  }, [internalDrivers]);

  if (driversStandings.length === 0) {
    return <EmptyMinimal icon="🏆" message={t("championship.drivers.no_data")} />;
  }

  return (
    <motion.div
      className="space-y-1.5"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {driversStandings.map((entry) => {
        const driver = entry.Driver;
        const constructor = entry.Constructors?.[0];
        const teamColor = getTeamColor(constructor?.constructorId);
        const mappedDriverId = DRIVER_ID_MAP[driver.driverId] || driver.familyName?.toLowerCase();
        const driverKey =
          driver.driverId || `${driver.givenName}-${driver.familyName}-${entry.position}`;

        // Use admin photo if available, otherwise fall back to resolver
        const adminPhoto = photoMap.get(mappedDriverId);
        const photoUrl = adminPhoto
          ? resolveDriverPhotoUrl({ id: mappedDriverId, ...adminPhoto })
          : resolveDriverPhotoUrl(mappedDriverId);

        return (
          <motion.div key={driverKey} variants={fadeUp}>
            <DriverCard
              position={parseInt(entry.position)}
              firstName={driver.givenName}
              lastName={driver.familyName}
              team={constructor?.name || ""}
              number={driver.permanentNumber || "?"}
              points={entry.points}
              wins={parseInt(entry.wins) || 0}
              photoUrl={photoUrl}
              teamColor={teamColor}
              onClick={() => navigate(`/driver/${mappedDriverId}`)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
