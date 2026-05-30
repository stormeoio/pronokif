/**
 * RulesContent — Game rules section for the hamburger menu.
 * Broadcast Premium: pk-surface cards, pk-amber accents.
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "./MenuHelpers";

interface RuleSectionProps {
  title: string;
  text?: string;
  children?: ReactNode;
}

function RuleSection({ title, text, children }: RuleSectionProps) {
  return (
    <motion.section
      className="bg-white/[0.04] rounded-lg p-3 border border-pk-amber/20"
      variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
    >
      <h4 className="font-display text-xs text-pk-amber mb-2">{title}</h4>
      {text && <p>{text}</p>}
      {children}
    </motion.section>
  );
}

export function RulesContent() {
  const { t } = useTranslation();
  const requiredItems = t("menu.rules.required_items", { returnObjects: true }) as {
    label: string;
    text: string;
  }[];
  const bonusItems = t("menu.rules.bonus_items", { returnObjects: true }) as {
    label: string;
    text: string;
  }[];
  const sprintItems = t("menu.rules.sprint_items", { returnObjects: true }) as string[];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Trophy}
        title={t("menu.rules.title")}
        subtitle={t("menu.rules.subtitle")}
        color="bg-pk-amber"
      />
      <motion.div
        className="space-y-4 text-sm text-pk-piste/80 leading-relaxed"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        <RuleSection
          title={t("menu.rules.principle_title")}
          text={t("menu.rules.principle_text")}
        />
        <RuleSection title={t("menu.rules.required_title")}>
          <ul className="space-y-2 text-pk-titane">
            {requiredItems.map((item) => (
              <li key={item.label} className="flex items-start gap-2">
                <span className="text-pk-amber">&#x2022;</span>
                <span>
                  <strong className="text-white">{item.label}</strong> : {item.text}
                </span>
              </li>
            ))}
          </ul>
        </RuleSection>
        <RuleSection title={t("menu.rules.bonus_title")}>
          <ul className="space-y-2 text-pk-titane">
            {bonusItems.map((item) => (
              <li key={item.label} className="flex items-start gap-2">
                <span className="text-pk-amber">&#x26A1;</span>
                <span>
                  <strong className="text-white">{item.label}</strong> : {item.text}
                </span>
              </li>
            ))}
          </ul>
        </RuleSection>
        <RuleSection title={t("menu.rules.sprint_title")}>
          <p className="text-pk-titane">
            {t("menu.rules.sprint_intro")}{" "}
            <strong className="text-white">{t("menu.rules.sprint_strong")}</strong>{" "}
            {t("menu.rules.sprint_suffix")}
          </p>
          <ul className="mt-2 space-y-1 text-pk-titane">
            {sprintItems.map((item) => (
              <li key={item}>&#x2022; {item}</li>
            ))}
          </ul>
        </RuleSection>
        <RuleSection title={t("menu.rules.deadline_title")}>
          <p className="text-pk-titane">
            {t("menu.rules.deadline_intro")}{" "}
            <strong className="text-white">{t("menu.rules.deadline_strong")}</strong>{" "}
            {t("menu.rules.deadline_suffix")}
          </p>
          <p className="mt-2 text-pk-red text-xs">{t("menu.rules.deadline_warning")}</p>
        </RuleSection>
        <RuleSection title={t("menu.rules.leagues_title")} text={t("menu.rules.leagues_text")} />
      </motion.div>
    </div>
  );
}
