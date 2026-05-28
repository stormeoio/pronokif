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
      <SectionHeader
        icon={Trophy}
        title="Règles du jeu"
        subtitle="Comment ça marche"
        color="bg-pk-amber"
      />
      <motion.div
        className="space-y-4 text-sm text-pk-piste/80 leading-relaxed"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        <RuleSection
          title="Principe général"
          text="PRONOKIF est un jeu de pronostics F1. Avant chaque Grand Prix, tu prédis les résultats des qualifications et de la course. Plus tes pronostics sont précis, plus tu marques de points !"
        />
        <RuleSection title="Pronostics obligatoires">
          <ul className="space-y-2 text-pk-titane">
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Pole Position</strong> : Choisis le pilote qui
                décrochera la pole
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Top 10 Qualifications</strong> : Choisis les 10
                premiers qualifiés dans l'ordre
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Vainqueur</strong> : Choisis le vainqueur de la
                course
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x2022;</span>
              <span>
                <strong className="text-white">Top 10 Course</strong> : Choisis les 10 premiers à
                l'arrivée dans l'ordre
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
                pendant la course ?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x26A1;</span>
              <span>
                <strong className="text-white">Meilleur tour</strong> : Quel pilote signera le
                meilleur tour ?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pk-amber">&#x26A1;</span>
              <span>
                <strong className="text-white">Leader virage 1</strong> : Qui sera en tête au
                premier virage ?
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
            Lors des week-ends Sprint, tu as{" "}
            <strong className="text-white">deux séries de pronostics</strong> à faire :
          </p>
          <ul className="mt-2 space-y-1 text-pk-titane">
            <li>&#x2022; Sprint : ferme 15 min avant les Sprint Qualifications (SQ1)</li>
            <li>&#x2022; Course principale : ferme 15 min avant les Qualifications (Q1)</li>
          </ul>
        </RuleSection>
        <RuleSection title="Délais">
          <p className="text-pk-titane">
            Les pronostics doivent être enregistrés{" "}
            <strong className="text-white">15 minutes avant le début de la première session</strong>{" "}
            concernée (Q1 pour la course, SQ1 pour le sprint).
          </p>
          <p className="mt-2 text-pk-red text-xs">
            Après la deadline, les pronostics ne sont plus modifiables !
          </p>
        </RuleSection>
        <RuleSection
          title="Ligues"
          text="Crée ou rejoins une ligue pour défier tes potes ! Chaque ligue a son propre classement. Tu peux appartenir à plusieurs ligues en même temps."
        />
      </motion.div>
    </div>
  );
}
