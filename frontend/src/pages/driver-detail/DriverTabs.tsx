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
import {
  InfoRow,
  StatCard,
  formatDate,
  factIcons,
  getTeamColors,
  type TeamColors,
} from "./driverHelpers";

interface TabProps {
  driver: Record<string, any>;
  colors: TeamColors;
}

export function ProfileTab({ driver, colors }: TabProps) {
  const contract = driver.contract || {};

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } }, hidden: {} }}
    >
      {/* Personal Info */}
      <motion.div className="card-arcade p-4" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
          <User className="w-4 h-4" style={{ color: colors.primary }} /> Informations personnelles
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Nom complet" value={driver.full_name} />
          <InfoRow label="Date de naissance" value={formatDate(driver.date_of_birth)} />
          <InfoRow label="Lieu de naissance" value={driver.place_of_birth} />
          <InfoRow label="Nationalite" value={driver.country_name} />
          <InfoRow label="Taille" value={driver.height_cm ? `${driver.height_cm} cm` : "-"} />
          <InfoRow label="Poids" value={driver.weight_kg ? `${driver.weight_kg} kg` : "-"} />
        </div>
      </motion.div>

      {/* Contract Info */}
      <motion.div className="card-arcade p-4" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: colors.primary }} /> Contrat actuel
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Equipe" value={driver.team} />
          <InfoRow label="Numero" value={`#${driver.number}`} />
          <InfoRow label="Debut contrat" value={contract.start_year || "-"} />
          <InfoRow label="Fin contrat" value={contract.end_year || "-"} />
          <InfoRow label="Salaire estime" value={contract.salary_estimate || "-"} />
          <InfoRow label="Points permis" value={`${driver.license_points || 12}/12`} />
        </div>
        {contract.notes && (
          <p className="mt-3 font-body text-xs text-gray-500 italic border-t border-gray-800 pt-3">
            {contract.notes}
          </p>
        )}
      </motion.div>

      {/* Social Media */}
      {driver.social && (
        <motion.div className="card-arcade p-4" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
          <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" style={{ color: colors.primary }} /> Reseaux sociaux
          </h3>
          <div className="flex gap-3">
            {driver.social.instagram && (
              <a
                href={`https://instagram.com/${driver.social.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center gap-2 hover:border-purple-500/50 transition-colors"
              >
                <Instagram className="w-5 h-5 text-purple-400" />
                <span className="font-body text-sm text-white">{driver.social.instagram}</span>
              </a>
            )}
            {driver.social.twitter && (
              <a
                href={`https://twitter.com/${driver.social.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center gap-2 hover:border-blue-500/50 transition-colors"
              >
                <Twitter className="w-5 h-5 text-blue-400" />
                <span className="font-body text-sm text-white">{driver.social.twitter}</span>
              </a>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export function PalmaresTab({ driver, colors }: TabProps) {
  const f1Stats = driver.palmares?.f1 || {};
  const juniorCareer = driver.palmares?.junior || [];

  return (
    <div className="space-y-4">
      <div className="card-arcade p-4">
        <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" /> Carriere F1
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard
            value={f1Stats.world_championships || 0}
            label="Titres"
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
          />
          <StatCard
            value={f1Stats.wins || 0}
            label="Victoires"
            color="text-green-400"
            bgColor="bg-green-500/10"
          />
          <StatCard
            value={f1Stats.podiums || 0}
            label="Podiums"
            color="text-cyan-400"
            bgColor="bg-cyan-500/10"
          />
          <StatCard
            value={f1Stats.poles || 0}
            label="Poles"
            color="text-purple-400"
            bgColor="bg-purple-500/10"
          />
          <StatCard
            value={f1Stats.fastest_laps || 0}
            label="Meilleurs tours"
            color="text-pink-400"
            bgColor="bg-pink-500/10"
          />
          <StatCard
            value={f1Stats.points || 0}
            label="Points"
            color="text-white"
            bgColor="bg-gray-500/10"
          />
        </div>
        <div className="border-t border-gray-800 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-body text-xs text-gray-500">Saisons</span>
            <span className="font-body text-sm text-white">{f1Stats.seasons || "-"}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="font-body text-xs text-gray-500">Premiere equipe</span>
            <span className="font-body text-sm text-white">{f1Stats.first_team || "-"}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="font-body text-xs text-gray-500">Grands Prix disputes</span>
            <span className="font-body text-sm text-white">{f1Stats.entries || 0}</span>
          </div>
        </div>
      </div>

      {juniorCareer.length > 0 && (
        <div className="card-arcade p-4">
          <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" /> Carriere junior
          </h3>
          <div className="space-y-2">
            {juniorCareer.map((season: { year: number; series: string; team: string; position: number; wins?: number; note?: string }, idx: number) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  season.position === 1
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : season.position === 2
                      ? "bg-gray-400/10 border-gray-400/30"
                      : season.position === 3
                        ? "bg-amber-600/10 border-amber-600/30"
                        : "bg-gray-800/30 border-gray-700/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-data text-xl ${
                        season.position === 1
                          ? "text-yellow-400"
                          : season.position === 2
                            ? "text-gray-300"
                            : season.position === 3
                              ? "text-amber-500"
                              : "text-gray-500"
                      }`}
                    >
                      {season.position === 1 && <Trophy className="w-5 h-5 inline" />}
                      {season.position !== 1 && `P${season.position}`}
                    </span>
                    <div>
                      <p className="font-heading text-sm text-white">{season.series}</p>
                      <p className="font-body text-xs text-gray-500">{season.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-lg text-white">{season.year}</p>
                    {(season.wins ?? 0) > 0 && (
                      <p className="font-body text-xs text-green-400">{season.wins} victoires</p>
                    )}
                  </div>
                </div>
                {season.note && (
                  <p className="font-body text-xs text-gray-500 mt-2 italic">{season.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FactsTab({ driver, colors }: TabProps) {
  const facts = driver.useful_facts || [];

  return (
    <div className="space-y-3">
      <div className="card-arcade p-4 mb-4">
        <h3 className="font-heading text-sm text-white flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" /> 10 infos utiles sur {driver.first_name}
        </h3>
        <p className="font-body text-xs text-gray-500 mt-1">
          Des faits interessants pour vos pronostics
        </p>
      </div>

      {facts.map((fact: { icon: string; title: string; text: string }, idx: number) => {
        const IconComponent = factIcons[fact.icon] || Info;
        return (
          <div
            key={idx}
            className="card-arcade p-4 flex items-start gap-3"
            style={{ borderLeftWidth: "3px", borderLeftColor: colors.primary }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <IconComponent className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <div className="flex-1">
              <p className="font-heading text-sm text-white">{fact.title}</p>
              <p className="font-body text-xs text-gray-400 mt-1">{fact.text}</p>
            </div>
            <span className="font-data text-xs text-gray-600">#{idx + 1}</span>
          </div>
        );
      })}

      {facts.length === 0 && (
        <div className="card-arcade p-8 text-center">
          <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-body text-gray-400">Aucune information disponible</p>
        </div>
      )}
    </div>
  );
}
