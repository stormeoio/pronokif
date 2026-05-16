import type { ReactNode } from "react";
import { Trophy } from "lucide-react";
import { SectionHeader } from "./MenuHelpers";

interface RuleSectionProps {
  title: string;
  text?: string;
  children?: ReactNode;
}

function RuleSection({ title, text, children }: RuleSectionProps) {
  return (
    <section className="bg-gray-800/50 rounded-lg p-3 border border-orange-500/20">
      <h4 className="font-heading text-sm text-orange-400 mb-2">{title}</h4>
      {text && <p>{text}</p>}
      {children}
    </section>
  );
}

export function RulesContent() {
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Trophy}
        title="Règles du jeu"
        subtitle="Comment ça marche"
        color="from-orange-500 to-orange-700"
      />
      <div className="space-y-4 font-body text-sm text-gray-300 leading-relaxed">
        <RuleSection
          title="Principe général"
          text="PRONOKIF est un jeu de pronostics F1. Avant chaque Grand Prix, tu dois prédire les résultats des qualifications et de la course. Plus tes pronostics sont précis, plus tu gagnes de points !"
        />
        <RuleSection title="Pronostics obligatoires">
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              <span>
                <strong className="text-white">Pole Position</strong> : Pronostique le pilote qui
                sera en pole
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              <span>
                <strong className="text-white">Top 10 Qualifs</strong> : Pronostique les 10 premiers
                des qualifications dans l'ordre
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              <span>
                <strong className="text-white">Vainqueur</strong> : Pronostique le vainqueur de la
                course
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              <span>
                <strong className="text-white">Top 10 Course</strong> : Pronostique les 10 premiers
                de la course dans l'ordre
              </span>
            </li>
          </ul>
        </RuleSection>
        <RuleSection title="Pronostics bonus">
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">⚡</span>
              <span>
                <strong className="text-white">Safety Car</strong> : Y aura-t-il un Safety Car
                pendant la course ?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">⚡</span>
              <span>
                <strong className="text-white">Meilleur tour</strong> : Quel pilote réalisera le
                meilleur tour ?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">⚡</span>
              <span>
                <strong className="text-white">Leader T1</strong> : Qui sera en tête au premier
                virage ?
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">⚡</span>
              <span>
                <strong className="text-white">Abandons (DNF)</strong> : Quels pilotes abandonneront
                ? (ou "Pas de DNF")
              </span>
            </li>
          </ul>
        </RuleSection>
        <RuleSection title="Weekends Sprint">
          <p className="text-gray-400">
            Lors des weekends avec Sprint, tu as{" "}
            <strong className="text-white">deux séries de pronostics</strong> à faire :
          </p>
          <ul className="mt-2 space-y-1 text-gray-400">
            <li>• Sprint : Clôture 15 min avant Sprint Qualifs (SQ1)</li>
            <li>• Course principale : Clôture 15 min avant Qualifs (Q1)</li>
          </ul>
        </RuleSection>
        <RuleSection title="Dates limites">
          <p className="text-gray-400">
            Les pronostics doivent être enregistrés{" "}
            <strong className="text-white">15 minutes avant le début de la première session</strong>{" "}
            concernée (Q1 pour la course, SQ1 pour le sprint).
          </p>
          <p className="mt-2 text-red-400 text-xs">
            ⚠️ Après la clôture, les pronostics ne peuvent plus être modifiés !
          </p>
        </RuleSection>
        <RuleSection
          title="Ligues"
          text="Crée ou rejoins une ligue pour défier tes amis ! Le classement de chaque ligue est indépendant. Tu peux appartenir à plusieurs ligues simultanément."
        />
      </div>
    </div>
  );
}
