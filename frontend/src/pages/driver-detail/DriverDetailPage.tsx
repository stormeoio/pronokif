import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, User, History, Lightbulb, Loader2, GitCompare } from "lucide-react";
import { getTeamColors } from "./driverHelpers";
import { ProfileTab, PalmaresTab, FactsTab } from "./DriverTabs";
import { useDriverDetailData } from "./useDriverDetailData";
import { haptic } from "@/lib/haptics";

export default function DriverDetailPage() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  const { loading, driver, error } = useDriverDetailData(driverId);

  useEffect(() => {
    if (error) {
      toast.error("Impossible de charger les informations du pilote");
      navigate("/championship");
    }
  }, [error, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="font-body text-gray-400">Chargement du pilote...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="font-body text-gray-400">Pilote non trouvé</p>
        </div>
      </div>
    );
  }

  const colors = getTeamColors(driver.team_id);
  const f1Stats = driver.palmares?.f1 || {};

  return (
    <div className="min-h-screen bg-app-main pb-24">
      {/* Header with driver photo */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 50%, #050a14 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.button
          onClick={() => navigate("/championship")}
          className="absolute top-4 left-4 z-20 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          aria-label="Retour au championnat"
          data-testid="back-button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <motion.button
          onClick={() => navigate(`/compare?d1=${driver.id}`)}
          className="absolute top-4 left-16 z-20 p-2 bg-cyan-500/80 backdrop-blur-sm rounded-full text-white hover:bg-cyan-600 transition-colors"
          aria-label="Comparer avec un autre pilote"
          data-testid="compare-button"
          title="Comparer avec un autre pilote"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
        >
          <GitCompare className="w-5 h-5" />
        </motion.button>
        <motion.div
          className="absolute top-4 right-4 z-20 px-4 py-2 rounded-lg font-data text-3xl text-white"
          style={{ backgroundColor: colors.primary }}
          initial={{ scale: 0, rotate: 10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
        >
          #{driver.number}
        </motion.div>

        <div className="pt-16 pb-6 px-4 flex justify-center">
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          >
            <div
              className="w-48 h-48 rounded-full border-4 overflow-hidden bg-gray-800"
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
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 border border-gray-700 rounded-full"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="font-body text-xs text-gray-300">{driver.country_name}</span>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="text-center pb-6 px-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="font-heading text-2xl text-white">
            {driver.first_name}{" "}
            <span style={{ color: colors.primary }}>{driver.last_name?.toUpperCase()}</span>
          </h1>
          <p className="font-body text-sm text-gray-400 mt-1">{driver.team}</p>
          <motion.div
            className="flex justify-center gap-6 mt-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } }, hidden: {} }}
          >
            {f1Stats.world_championships > 0 && (
              <motion.div
                className="text-center"
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              >
                <p className="font-data text-xl text-yellow-400">{f1Stats.world_championships}</p>
                <p className="font-body text-[10px] text-gray-500 uppercase">Titres</p>
              </motion.div>
            )}
            <motion.div
              className="text-center"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <p className="font-data text-xl text-white">{f1Stats.wins || 0}</p>
              <p className="font-body text-[10px] text-gray-500 uppercase">Victoires</p>
            </motion.div>
            <motion.div
              className="text-center"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <p className="font-data text-xl text-white">{f1Stats.podiums || 0}</p>
              <p className="font-body text-[10px] text-gray-500 uppercase">Podiums</p>
            </motion.div>
            <motion.div
              className="text-center"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <p className="font-data text-xl text-white">{f1Stats.poles || 0}</p>
              <p className="font-body text-[10px] text-gray-500 uppercase">Poles</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-30 bg-[#050a14]/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg relative">
            {[
              { id: "profile", icon: User, label: "Pilote" },
              { id: "palmares", icon: History, label: "Palmares" },
              { id: "facts", icon: Lightbulb, label: "Infos" },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => { haptic("light"); setActiveTab(tab.id); }}
                className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 relative ${
                  activeTab === tab.id
                    ? "text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                style={activeTab === tab.id ? { backgroundColor: colors.primary } : {}}
                data-testid={`tab-${tab.id}`}
                whileTap={{ scale: 0.95 }}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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
