/**
 * DriverDetailPage — Individual driver profile with tabs.
 * Broadcast Premium: team-color hero gradient, glass tabs, pk-* cards.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, User, History, Lightbulb, GitCompare } from "lucide-react";
import { getTeamColors } from "./driverHelpers";
import { ProfileTab, PalmaresTab, FactsTab } from "./DriverTabs";
import { useDriverDetailData } from "./useDriverDetailData";
import { TeamEntityToken } from "@/components/entities/TeamEntityToken";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";

/* ── Skeleton ─────────────────────────────────────────── */

function DriverDetailSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="h-72 bg-pk-surface animate-shimmer" />
      <div className="px-4 pt-4 space-y-3 pb-24">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function DriverDetailPage() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);
  const [activeTab, setActiveTab] = useState("profile");

  const { loading, driver, error } = useDriverDetailData(driverId);

  useEffect(() => {
    if (error) {
      toast.error("Impossible de charger les infos du pilote");
      navigate("/championship");
    }
  }, [error, navigate]);

  if (loading) return <DriverDetailSkeleton />;

  if (!driver) {
    return (
      <div className="min-h-screen bg-pk-carbon flex items-center justify-center">
        <div className="text-center">
          <User className="w-10 h-10 text-pk-titane mx-auto mb-3" />
          <p className="text-sm text-pk-titane">Pilote introuvable</p>
        </div>
      </div>
    );
  }

  const colors = getTeamColors(driver.team_id);
  const f1Stats = driver.palmares?.f1 || {};

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="driver-detail-page">
      {/* Hero Header with driver photo */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}08 50%, #0B0D12 100%)`,
        }}
        {...rmProps}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Top actions */}
        <button
          onClick={() => navigate("/championship")}
          className="absolute top-4 left-4 z-20 p-2 bg-pk-carbon/60 backdrop-blur-sm rounded-lg text-pk-piste hover:text-white transition-colors"
          aria-label="Back to championship"
          data-testid="driver-back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            haptic("light");
            navigate(`/compare?d1=${driver.id}`);
          }}
          className="absolute top-4 left-14 z-20 p-2 bg-pk-info/80 backdrop-blur-sm rounded-lg text-white hover:bg-pk-info transition-colors"
          aria-label="Compare with another driver"
          data-testid="driver-compare"
          title="Comparer"
        >
          <GitCompare className="w-5 h-5" />
        </button>

        {/* Number badge */}
        <motion.div
          className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg font-data text-2xl font-bold text-white"
          style={{ backgroundColor: colors.primary }}
          {...rmProps}
          initial={{ scale: 0, rotate: 10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
        >
          #{driver.number}
        </motion.div>

        {/* Photo */}
        <div className="pt-16 pb-6 px-4 flex justify-center">
          <motion.div
            className="relative"
            {...rmProps}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          >
            <div
              className="w-40 h-40 rounded-full border-[3px] overflow-hidden bg-pk-anthracite"
              style={{ borderColor: colors.primary }}
            >
              <img
                src={driver.photo_url}
                alt={driver.full_name}
                className="w-full h-full object-cover object-top"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.src =
                    "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback_image.png.transform/1col/image.png";
                }}
              />
            </div>
            <motion.div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-pk-carbon/90 border border-white/[0.08] rounded-full"
              {...rmProps}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="font-data text-[0.5625rem] text-pk-titane">
                {driver.country_name}
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* Name + quick stats */}
        <motion.div
          className="text-center pb-6 px-4"
          {...rmProps}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="font-display text-xl">
            {driver.first_name}{" "}
            <span style={{ color: colors.primary }}>{driver.last_name?.toUpperCase()}</span>
          </h1>
          <p className="font-data text-[0.5625rem] text-pk-titane mt-2">
            <TeamEntityToken
              teamId={driver.team_id}
              name={driver.team}
              linked={false}
              className="text-[0.5625rem]"
            />
          </p>

          <motion.div
            className="flex justify-center gap-6 mt-4"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {f1Stats.world_championships > 0 && (
              <motion.div className="text-center" variants={fadeUp}>
                <p className="font-data text-lg text-pk-gold">{f1Stats.world_championships}</p>
                <p className="font-data text-[0.5rem] text-pk-titane uppercase">Titres</p>
              </motion.div>
            )}
            <motion.div className="text-center" variants={fadeUp}>
              <p className="font-data text-lg">{f1Stats.wins || 0}</p>
              <p className="font-data text-[0.5rem] text-pk-titane uppercase">Victoires</p>
            </motion.div>
            <motion.div className="text-center" variants={fadeUp}>
              <p className="font-data text-lg">{f1Stats.podiums || 0}</p>
              <p className="font-data text-[0.5rem] text-pk-titane uppercase">Podiums</p>
            </motion.div>
            <motion.div className="text-center" variants={fadeUp}>
              <p className="font-data text-lg">{f1Stats.poles || 0}</p>
              <p className="font-data text-[0.5rem] text-pk-titane uppercase">Poles</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-30 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex gap-1.5">
            {[
              { id: "profile", Icon: User, label: "Pilote" },
              { id: "palmares", Icon: History, label: "Palmarès" },
              { id: "facts", Icon: Lightbulb, label: "Infos" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  haptic("light");
                  setActiveTab(tab.id);
                }}
                className={`flex-1 py-2.5 rounded-lg font-display text-xs transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                    ? "text-white"
                    : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
                }`}
                style={
                  activeTab === tab.id
                    ? { backgroundColor: colors.primary, border: `1px solid ${colors.primary}40` }
                    : {}
                }
                data-testid={`tab-${tab.id}`}
              >
                <tab.Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "profile" && <ProfileTab driver={driver} colors={colors} />}
            {activeTab === "palmares" && <PalmaresTab driver={driver} colors={colors} />}
            {activeTab === "facts" && <FactsTab driver={driver} colors={colors} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
