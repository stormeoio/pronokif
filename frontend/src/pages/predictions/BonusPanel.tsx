import { motion } from "framer-motion";
import { AlertTriangle, Timer, Flag, X, Zap, CheckCircle2, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Driver } from "./DriverPicker";
import { haptic } from "@/lib/haptics";
import { fadeUp } from "@/lib/motion";

// ----------------------------------------------------------- types ---

export interface BonusPanelProps {
  activeTab: string;
  drivers: Driver[];
  setSelectionMode: (mode: string) => void;
  safetyCar: boolean | null;
  setSafetyCar: (v: boolean | null) => void;
  fastestLap: string | null;
  firstCorner: string | null;
  noDnf: boolean;
  setNoDnf: (v: boolean) => void;
  dnfDrivers: string[];
  setDnfDrivers: (v: string[]) => void;
}

// ----------------------------------------------------------- component ---

export default function BonusPanel({
  activeTab,
  drivers,
  setSelectionMode,
  safetyCar,
  setSafetyCar,
  fastestLap,
  firstCorner,
  noDnf,
  setNoDnf,
  dnfDrivers,
  setDnfDrivers,
}: BonusPanelProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="space-y-4 pt-4 border-t border-white/[0.08]"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      {/* Section title */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-pk-amber/25 bg-pk-amber/10">
            <Zap size={16} strokeWidth={1.5} className="text-pk-amber" />
          </span>
          <div>
            <p className="font-data text-[0.5rem] uppercase tracking-[0.16em] text-pk-amber">
              {t("predictions.form.bonus.points")}
            </p>
            <h3 className="font-display text-[0.875rem] uppercase">
              {t("predictions.form.bonus.title")}
              {activeTab === "sprint" ? ` ${t("predictions.sprint")}` : ""}
            </h3>
          </div>
        </div>
        <span className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-data text-[0.5625rem] uppercase text-pk-titane">
          {t("predictions.form.optional")}
        </span>
      </div>

      {/* Safety Car */}
      <div className="rounded-md border border-white/[0.08] bg-pk-surface p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-pk-amber/10 text-pk-amber">
            <AlertTriangle size={16} strokeWidth={1.5} />
          </span>
          <span className="text-[0.8125rem] font-medium">
            {t("predictions.form.bonus.safety_car")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setSafetyCar(true);
            }}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-sm border px-3 font-data text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                safetyCar === true
                  ? "bg-pk-emerald/20 border border-pk-emerald/30 text-pk-emerald"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
            data-testid="bonus-safety-car-yes"
          >
            {safetyCar === true && <CheckCircle2 size={13} strokeWidth={2} />}
            {t("predictions.form.bonus.yes")}
          </button>
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setSafetyCar(false);
            }}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-sm border px-3 font-data text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                safetyCar === false
                  ? "bg-pk-red-subtle border border-[rgba(225,6,0,0.2)] text-pk-red"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
            data-testid="bonus-safety-car-no"
          >
            {safetyCar === false && <CheckCircle2 size={13} strokeWidth={2} />}
            {t("predictions.form.bonus.no")}
          </button>
        </div>
      </div>

      {/* Fastest Lap */}
      <button
        type="button"
        onClick={() =>
          setSelectionMode(activeTab === "sprint" ? "sprint_fastest_lap" : "fastest_lap")
        }
        className="flex min-h-[58px] w-full items-center justify-between gap-3 rounded-md border border-white/[0.08] bg-pk-surface p-3 text-left transition-all duration-pk-short hover:border-white/[0.15] hover:bg-pk-anthracite"
        data-testid="bonus-fastest-lap"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-pk-amber/10 text-pk-amber">
            <Timer size={16} strokeWidth={1.5} />
          </span>
          <span className="truncate text-[0.8125rem] font-medium">
            {t("predictions.form.bonus.fastest_lap")}
          </span>
        </div>
        <span className="flex min-w-0 shrink-0 items-center gap-1.5 font-data text-[0.6875rem] uppercase text-pk-red">
          {fastestLap
            ? drivers.find((d) => d.id === fastestLap)?.name || t("predictions.form.bonus.selected")
            : t("predictions.form.bonus.select")}
          <ChevronRight size={13} strokeWidth={1.8} />
        </span>
      </button>

      {/* First Corner Leader */}
      <button
        type="button"
        onClick={() =>
          setSelectionMode(activeTab === "sprint" ? "sprint_first_corner" : "first_corner")
        }
        className="flex min-h-[58px] w-full items-center justify-between gap-3 rounded-md border border-white/[0.08] bg-pk-surface p-3 text-left transition-all duration-pk-short hover:border-white/[0.15] hover:bg-pk-anthracite"
        data-testid="bonus-first-corner"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-pk-emerald/10 text-pk-emerald">
            <Flag size={16} strokeWidth={1.5} />
          </span>
          <span className="truncate text-[0.8125rem] font-medium">
            {t("predictions.form.bonus.first_corner")}
          </span>
        </div>
        <span className="flex min-w-0 shrink-0 items-center gap-1.5 font-data text-[0.6875rem] uppercase text-pk-red">
          {firstCorner
            ? drivers.find((d) => d.id === firstCorner)?.name ||
              t("predictions.form.bonus.selected")
            : t("predictions.form.bonus.select")}
          <ChevronRight size={13} strokeWidth={1.8} />
        </span>
      </button>

      {/* DNF */}
      <div className="space-y-3 rounded-md border border-white/[0.08] bg-pk-surface p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-pk-red-subtle text-pk-red">
            <X size={16} strokeWidth={1.5} />
          </span>
          <span className="text-[0.8125rem] font-medium">{t("predictions.form.bonus.dnf")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setNoDnf(true);
              setDnfDrivers([]);
            }}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-sm border px-2 font-data text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                noDnf
                  ? "bg-pk-emerald/20 border border-pk-emerald/30 text-pk-emerald"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
            data-testid="bonus-no-dnf"
          >
            {noDnf && <CheckCircle2 size={13} strokeWidth={2} />}
            {t("predictions.form.bonus.no_dnf")}
          </button>
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setNoDnf(false);
              setSelectionMode(activeTab === "sprint" ? "sprint_dnf_select" : "dnf_select");
            }}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-sm border px-2 font-data text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                !noDnf && dnfDrivers.length > 0
                  ? "bg-pk-red-subtle border border-[rgba(225,6,0,0.2)] text-pk-red"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
            data-testid="bonus-dnf-select"
          >
            {dnfDrivers.length > 0
              ? t("predictions.form.bonus.drivers_count", { count: dnfDrivers.length })
              : t("predictions.form.bonus.select")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
