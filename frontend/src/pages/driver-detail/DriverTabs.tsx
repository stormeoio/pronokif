/**
 * DriverTabs — Profile, Palmares, Facts sub-tabs for DriverDetail.
 * Broadcast Premium: pk-surface cards, pk-gold/silver/bronze ranks.
 */
import { motion } from "framer-motion";
import {
  Trophy,
  Flag,
  History,
  Lightbulb,
  Info,
  User,
  FileText,
  Star,
  Instagram,
  Twitter,
} from "lucide-react";
import { InfoRow, StatCard, formatDate, factIcons, type TeamColors } from "./driverHelpers";
import { staggerContainer, fadeUp } from "@/lib/motion";

interface TabProps {
  driver: Record<string, any>;
  colors: TeamColors;
}

/* ── Profile Tab ──────────────────────────────────────── */

export function ProfileTab({ driver, colors }: TabProps) {
  const contract = driver.contract || {};

  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Personal Info */}
      <motion.div
        className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
        variants={fadeUp}
      >
        <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" style={{ color: colors.primary }} /> Informations
          personnelles
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Nom complet" value={driver.full_name} />
          <InfoRow label="Date de naissance" value={formatDate(driver.date_of_birth)} />
          <InfoRow label="Lieu de naissance" value={driver.place_of_birth} />
          <InfoRow label="Nationalité" value={driver.country_name} />
          <InfoRow label="Taille" value={driver.height_cm ? `${driver.height_cm} cm` : "-"} />
          <InfoRow label="Poids" value={driver.weight_kg ? `${driver.weight_kg} kg` : "-"} />
        </div>
      </motion.div>

      {/* Contract Info */}
      <motion.div
        className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
        variants={fadeUp}
      >
        <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" style={{ color: colors.primary }} /> Contrat actuel
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Écurie" value={driver.team} />
          <InfoRow label="Numéro" value={`#${driver.number}`} />
          <InfoRow label="Début contrat" value={contract.start_year || "-"} />
          <InfoRow label="Fin contrat" value={contract.end_year || "-"} />
          <InfoRow label="Salaire estimé" value={contract.salary_estimate || "-"} />
          <InfoRow label="Points de permis" value={`${driver.license_points || 12}/12`} />
        </div>
        {contract.notes && (
          <p className="mt-3 text-xs text-pk-titane italic border-t border-white/[0.06] pt-3">
            {contract.notes}
          </p>
        )}
      </motion.div>

      {/* Social Media */}
      {driver.social && (
        <motion.div
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
          variants={fadeUp}
        >
          <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" style={{ color: colors.primary }} /> Réseaux sociaux
          </h3>
          <div className="flex gap-2">
            {driver.social.instagram && (
              <a
                href={`https://instagram.com/${driver.social.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 p-3 bg-purple-500/[0.06] border border-purple-500/20 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-500/[0.12] transition-colors"
              >
                <Instagram className="w-4 h-4 text-purple-400" />
                <span className="text-xs">{driver.social.instagram}</span>
              </a>
            )}
            {driver.social.twitter && (
              <a
                href={`https://twitter.com/${driver.social.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 p-3 bg-pk-info/[0.06] border border-pk-info/20 rounded-lg flex items-center justify-center gap-2 hover:bg-pk-info/[0.12] transition-colors"
              >
                <Twitter className="w-4 h-4 text-pk-info" />
                <span className="text-xs">{driver.social.twitter}</span>
              </a>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Palmares Tab ─────────────────────────────────────── */

export function PalmaresTab({ driver, colors }: TabProps) {
  const f1Stats = driver.palmares?.f1 || {};
  const juniorCareer = driver.palmares?.junior || [];

  return (
    <div className="space-y-3">
      {/* F1 Career */}
      <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
        <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-pk-gold" /> Carrière F1
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatCard
            value={f1Stats.world_championships || 0}
            label="Titres"
            color="text-pk-gold"
            bgColor="bg-pk-gold/[0.06]"
          />
          <StatCard
            value={f1Stats.wins || 0}
            label="Victoires"
            color="text-pk-emerald"
            bgColor="bg-pk-emerald/[0.06]"
          />
          <StatCard
            value={f1Stats.podiums || 0}
            label="Podiums"
            color="text-pk-info"
            bgColor="bg-pk-info/[0.06]"
          />
          <StatCard
            value={f1Stats.poles || 0}
            label="Poles"
            color="text-purple-400"
            bgColor="bg-purple-500/[0.06]"
          />
          <StatCard
            value={f1Stats.fastest_laps || 0}
            label="Meilleurs tours"
            color="text-pink-400"
            bgColor="bg-pink-500/[0.06]"
          />
          <StatCard
            value={f1Stats.points || 0}
            label="Points"
            color="text-pk-piste"
            bgColor="bg-white/[0.04]"
          />
        </div>
        <div className="border-t border-white/[0.06] pt-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-data text-[0.5rem] text-pk-titane uppercase">Saisons en F1</span>
            <span className="text-sm">{f1Stats.seasons || "-"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-data text-[0.5rem] text-pk-titane uppercase">
              Première équipe
            </span>
            <span className="text-sm">{f1Stats.first_team || "-"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-data text-[0.5rem] text-pk-titane uppercase">
              Grands Prix disputés
            </span>
            <span className="text-sm">{f1Stats.entries || 0}</span>
          </div>
        </div>
      </div>

      {/* Junior Career */}
      {juniorCareer.length > 0 && (
        <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
          <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-pk-info" /> Carrière junior
          </h3>
          <div className="space-y-1.5">
            {juniorCareer.map(
              (
                season: {
                  year: number;
                  series: string;
                  team: string;
                  position: number;
                  wins?: number;
                  note?: string;
                },
                idx: number,
              ) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    season.position === 1
                      ? "bg-pk-gold/[0.06] border-pk-gold/20"
                      : season.position === 2
                        ? "bg-pk-silver/[0.06] border-pk-silver/20"
                        : season.position === 3
                          ? "bg-pk-bronze/[0.06] border-pk-bronze/20"
                          : "bg-white/[0.02] border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-data text-lg ${
                          season.position === 1
                            ? "text-pk-gold"
                            : season.position === 2
                              ? "text-pk-silver"
                              : season.position === 3
                                ? "text-pk-bronze"
                                : "text-pk-titane"
                        }`}
                      >
                        {season.position === 1 && <Trophy className="w-5 h-5 inline" />}
                        {season.position !== 1 && `P${season.position}`}
                      </span>
                      <div>
                        <p className="font-display text-xs">{season.series}</p>
                        <p className="font-data text-[0.5rem] text-pk-titane">{season.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-data text-base">{season.year}</p>
                      {(season.wins ?? 0) > 0 && (
                        <p className="font-data text-[0.5rem] text-pk-emerald">
                          {season.wins} victoires
                        </p>
                      )}
                    </div>
                  </div>
                  {season.note && (
                    <p className="text-xs text-pk-titane mt-2 italic">{season.note}</p>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Facts Tab ────────────────────────────────────────── */

export function FactsTab({ driver, colors }: TabProps) {
  const facts = driver.useful_facts || [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
        <h3 className="font-display text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-pk-amber" /> 10 infos utiles sur {driver.first_name}
        </h3>
        <p className="text-xs text-pk-titane mt-1">Des infos utiles pour tes pronostics</p>
      </div>

      {/* Fact cards */}
      {facts.map((fact: { icon: string; title: string; text: string }, idx: number) => {
        const IconComponent = factIcons[fact.icon] || Info;
        return (
          <div
            key={idx}
            className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 flex items-start gap-3"
            style={{ borderLeftWidth: "3px", borderLeftColor: colors.primary }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.primary}15` }}
            >
              <IconComponent className="w-4 h-4" style={{ color: colors.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs">{fact.title}</p>
              <p className="text-xs text-pk-titane mt-1">{fact.text}</p>
            </div>
            <span className="font-data text-[0.5rem] text-pk-titane">#{idx + 1}</span>
          </div>
        );
      })}

      {facts.length === 0 && (
        <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-8 text-center">
          <Info className="w-10 h-10 text-pk-titane mx-auto mb-3" />
          <p className="text-sm text-pk-titane">Aucune information disponible</p>
        </div>
      )}
    </div>
  );
}
