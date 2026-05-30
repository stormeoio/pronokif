/**
 * ScoringContent — Points system breakdown in the hamburger menu.
 * Broadcast Premium: pk-surface cards, pk-info/amber/emerald accents.
 */
import { Fragment } from "react";
import { motion } from "framer-motion";
import { Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "./MenuHelpers";

export function ScoringContent() {
  const { t } = useTranslation();
  const mainScoring = t("menu.scoring.main", { returnObjects: true }) as {
    category: string;
    items: { label: string; points: string }[];
  }[];
  const bonusScoring = t("menu.scoring.bonus", { returnObjects: true }) as {
    label: string;
    points: string;
  }[];
  const specialScoring = t("menu.scoring.special", { returnObjects: true }) as {
    label: string;
    points: string;
  }[];
  const maxRows = t("menu.scoring.max_rows", { returnObjects: true }) as {
    label: string;
    points: string;
  }[];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Calculator}
        title={t("menu.scoring.title")}
        subtitle={t("menu.scoring.subtitle")}
        color="bg-pk-info"
      />
      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {mainScoring.map((section, idx) => (
          <motion.div
            key={idx}
            className="bg-white/[0.04] rounded-lg p-3 border border-pk-info/20"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          >
            <h4 className="font-display text-xs text-pk-info mb-3">{section.category}</h4>
            <div className="space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-pk-piste/80">{item.label}</span>
                  <span className="font-data text-sm text-pk-info font-semibold">
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
        <motion.div
          className="bg-white/[0.04] rounded-lg p-3 border border-pk-amber/20"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-display text-xs text-pk-amber mb-3">
            {t("menu.scoring.bonus_title")}
          </h4>
          <div className="space-y-2">
            {bonusScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-pk-piste/80">{item.label}</span>
                <span className="font-data text-sm text-pk-amber font-semibold">{item.points}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="bg-pk-emerald/[0.06] rounded-lg p-3 border border-pk-emerald/20"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-display text-xs text-pk-emerald mb-3">
            {t("menu.scoring.special_title")}
          </h4>
          <div className="space-y-2">
            {specialScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-pk-piste/80">{item.label}</span>
                <span className="font-data text-sm text-pk-emerald font-semibold">
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.08]"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <p className="text-xs text-pk-titane">
            <span className="text-pk-amber font-semibold">{t("menu.scoring.sprint_label")}</span>{" "}
            {t("menu.scoring.sprint_text")}
          </p>
        </motion.div>
        <motion.div
          className="bg-pk-amber/[0.06] rounded-lg p-3 border border-pk-amber/20"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-display text-xs text-pk-amber mb-2">{t("menu.scoring.max_title")}</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {maxRows.map((item, index) => (
              <Fragment key={item.label}>
                <div key={`${item.label}-label`} className="text-pk-titane">
                  {item.label}
                </div>
                <div
                  key={`${item.label}-points`}
                  className={`text-right font-semibold ${
                    index === maxRows.length - 1 ? "text-pk-amber" : "text-pk-info"
                  }`}
                >
                  {item.points}
                </div>
              </Fragment>
            ))}
            <div className="text-pk-piste font-semibold border-t border-white/[0.08] pt-1">
              {t("menu.scoring.max_total")}
            </div>
            <div className="text-right text-pk-emerald font-bold border-t border-white/[0.08] pt-1">
              {t("menu.scoring.max_total_points")}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
