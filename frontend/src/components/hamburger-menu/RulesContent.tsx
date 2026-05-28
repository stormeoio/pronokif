/**
 * RulesContent — Game rules section for the hamburger menu.
 * Broadcast Premium: pk-surface cards, pk-amber accents.
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
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
  return (
    <div className="space-y-4">
      <SectionHeader icon={Trophy} title="Game rules" subtitle="How it works" color="bg-pk-amber" />
      <motion.div
        className="space-y-4 text-sm text-pk-piste/80 leading-relaxed"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        <RuleSection
          title="General principle"
          text="PRONOKIF is an F1 prediction game. Before each Grand Prix, you predict qualifying and race results. The more accurate your predictions are, the more points you score!"
        />
        <RuleSection title="Pronostics obligatoires">
          <ul className="space-y-2 text-pk-titane">
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Pole Position</strong> : Pick the driver who will
                take la pole
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Top 10 Qualifications</strong> : Choose the top 10
                first qualifiers in order
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Winner</strong>: Pick the race winner
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Top 10 Race</strong> : Choose the top 10 finishers in
                order
              </span>
            </li>
          </ul>
        </RuleSection>
        <RuleSection title="Paris bonus">
          <ul className="space-y-2 text-pk-titane">
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x26A1;</span>
              <span>
                <strong className="text-white">Safety Car</strong> : Y aura-t-il un Safety Car
                during the race?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x26A1;</span>
              <span>
                <strong className="text-white">Fastest lap</strong> : Which driver will set the
                meilleur tour ?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x26A1;</span>
              <span>
                <strong className="text-white">Turn 1 leader</strong> : Who will lead at the first
                virage ?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x26A1;</span>
              <span>
                <strong className="text-white">Abandons (DNF)</strong> : Quels pilotes abandonneront
                ? (ou "Pas de DNF")
              </span>
            </li>
          </ul>
        </RuleSection>
        <RuleSection title="Week-ends Sprint">
          <p className="text-pk-titane">
            During Sprint weekends, you have{" "}
            <strong className="text-white">two sets of predictions</strong> to make:
          </p>
          <ul className="mt-2 space-y-1 text-pk-titane">
            <li>&#x2022; Sprint: closes 15 min before Sprint Qualifying (SQ1)</li>
            <li>&#x2022; Main race: closes 15 min before Qualifying (Q1)</li>
          </ul>
        </RuleSection>
        <RuleSection title="Deadlines">
          <p className="text-pk-titane">
            Predictions must be saved{" "}
            <strong className="text-white">15 minutes before the start of the first session</strong>{" "}
            concerned (Q1 for the race, SQ1 for the sprint).
          </p>
          <p className="mt-2 text-pk-red text-xs">
            After the deadline, predictions can no longer be edited!
          </p>
        </RuleSection>
        <RuleSection
          title="Ligues"
          text="Create or join a league to challenge your friends! Each league has its own leaderboard. You can belong to several leagues at once."
        />
      </motion.div>
    </div>
  );
}
