/**
 * DriverStandings — F1 drivers championship with premium DriverCard.
 * Broadcast Premium: pk-gold/silver/bronze podium, team-color accents, driver portraits.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getTeamColor, DRIVER_ID_MAP } from "./championshipUtils";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";
import { DriverCard } from "@/components/DriverCard";
import { resolveDriverPhotoUrl } from "@/lib/driverPhotos";

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
  const navigate = useNavigate();

  if (driversStandings.length === 0) {
    return <EmptyMinimal icon="🏆" message="Aucune donnee disponible" />;
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
              photoUrl={resolveDriverPhotoUrl(mappedDriverId)}
              teamColor={teamColor}
              onClick={() => navigate(`/driver/${mappedDriverId}`)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
