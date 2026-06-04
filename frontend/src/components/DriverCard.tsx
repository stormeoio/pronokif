/**
 * DriverCard — Premium driver card for standings & leaderboards.
 * Broadcast Premium: glass surface, team-color accent, driver portrait.
 *
 * Layout (from design mockup):
 * ┌─────────────────────────────────────────────┐
 * │  Position  │  Portrait  │  Name / Team  │ Points │
 * │   (rank)   │  + Number  │               │  PTS   │
 * └─────────────────────────────────────────────┘
 */
import { Crown, Medal, Award, Trophy } from "lucide-react";
import { haptic } from "@/lib/haptics";

// ------------------------------------------------------------------ types ---

export interface DriverCardProps {
  position: number;
  firstName: string;
  lastName: string;
  team: string;
  number: string | number;
  points: string | number;
  wins?: number;
  photoUrl?: string;
  teamColor: string;
  onClick?: () => void;
}

// ------------------------------------------------ driver photo URL helper ---

const DRIVER_PHOTOS: Record<string, string> = {
  norris:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png",
  piastri:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/1col/image.png",
  russell:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/1col/image.png",
  antonelli:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ANDANT01_Andrea_Kimi_Antonelli/andant01.png.transform/1col/image.png",
  leclerc:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png",
  hamilton:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png",
  verstappen:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png",
  hadjar:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/I/ISAHAD01_Isack_Hadjar/isahad01.png.transform/1col/image.png",
  sainz:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/1col/image.png",
  albon:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/1col/image.png",
  lawson:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/1col/image.png",
  lindblad:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ARVLIN01_Arvid_Lindblad/arvlin01.png.transform/1col/image.png",
  alonso:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/1col/image.png",
  stroll:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/1col/image.png",
  ocon: "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/1col/image.png",
  bearman:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/1col/image.png",
  gasly:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/1col/image.png",
  colapinto:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/1col/image.png",
  hulkenberg:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png",
  bortoleto:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png.transform/1col/image.png",
  perez:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/S/SERPER01_Sergio_Perez/serper01.png.transform/1col/image.png",
  bottas:
    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/V/VALBOT01_Valtteri_Bottas/valbot01.png.transform/1col/image.png",
};

export function getDriverPhotoUrl(driverId: string): string {
  return DRIVER_PHOTOS[driverId] || DRIVER_PHOTOS.norris;
}

/** Photo URL if we have a real headshot for this driver, else null (for fallbacks). */
export function getDriverPhoto(driverId: string): string | null {
  return DRIVER_PHOTOS[driverId] ?? null;
}

// ----------------------------------------------------------- rank helpers ---

function RankBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <div className="w-10 h-10 rounded-lg bg-pk-gold/15 flex items-center justify-center">
        <Crown className="w-5 h-5 text-pk-gold" />
      </div>
    );
  }
  if (position === 2) {
    return (
      <div className="w-10 h-10 rounded-lg bg-pk-silver/15 flex items-center justify-center">
        <Medal className="w-5 h-5 text-pk-silver" />
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="w-10 h-10 rounded-lg bg-pk-bronze/15 flex items-center justify-center">
        <Award className="w-5 h-5 text-pk-bronze" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
      <span className="font-data text-lg font-bold text-pk-titane">{position}</span>
    </div>
  );
}

// ------------------------------------------------------------ DriverCard ---

export function DriverCard({
  position,
  firstName,
  lastName,
  team,
  number,
  points,
  wins = 0,
  photoUrl,
  teamColor,
  onClick,
}: DriverCardProps) {
  const isPodium = position <= 3;

  return (
    <button
      onClick={() => {
        haptic("light");
        onClick?.();
      }}
      className={`
        w-full rounded-lg border overflow-hidden transition-all
        hover:bg-white/[0.03] active:scale-[0.99]
        ${
          isPodium
            ? position === 1
              ? "bg-pk-gold/[0.04] border-pk-gold/20"
              : position === 2
                ? "bg-pk-silver/[0.04] border-pk-silver/20"
                : "bg-pk-bronze/[0.04] border-pk-bronze/20"
            : "bg-pk-surface border-white/[0.08]"
        }
      `}
    >
      {/* Team color accent line */}
      <div className="h-[2px] w-full" style={{ backgroundColor: teamColor }} />

      <div className="flex items-center gap-3 p-3">
        {/* Position */}
        <RankBadge position={position} />

        {/* Portrait + Number */}
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full overflow-hidden border-2"
            style={{ borderColor: teamColor }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${firstName} ${lastName}`}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: `${teamColor}30` }}
              >
                <span className="font-data text-lg font-bold text-white">{number}</span>
              </div>
            )}
          </div>
          {/* Number badge overlay */}
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md flex items-center justify-center text-white font-data text-[0.5625rem] font-bold shadow-md"
            style={{ backgroundColor: teamColor }}
          >
            {number}
          </div>
        </div>

        {/* Name & Team */}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-body text-xs text-pk-titane leading-none">{firstName}</p>
          <p className="font-display text-sm uppercase tracking-wide leading-tight mt-0.5">
            <span className="text-pk-piste">{lastName}</span>
          </p>
          <p
            className="font-data text-[0.5625rem] uppercase tracking-wider mt-0.5 leading-none"
            style={{ color: teamColor }}
          >
            {team}
          </p>
        </div>

        {/* Points */}
        <div className="text-right flex-shrink-0">
          <p
            className={`font-data text-xl font-bold tabular-nums ${
              isPodium ? "text-pk-piste" : "text-pk-piste"
            }`}
          >
            {points}
          </p>
          <p className="font-data text-[0.5rem] text-pk-titane uppercase tracking-wider">pts</p>
        </div>
      </div>

      {/* Wins row (if any) */}
      {wins > 0 && (
        <div className="px-3 pb-2 -mt-1 flex items-center gap-1 ml-[5.5rem]">
          <Trophy className="w-3 h-3 text-pk-gold" />
          <span className="font-data text-[0.5rem] text-pk-gold">
            {wins} victoire{wins > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </button>
  );
}

export default DriverCard;
