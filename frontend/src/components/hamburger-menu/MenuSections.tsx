import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Shield, FileText, Mail, BookOpen, Trophy, Calculator, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";

// Tutorial Content
export function TutorialContent() {
  const steps = [
    {
      title: "1. Créer ou rejoindre une ligue",
      description:
        "Clique sur l'onglet 'Ligues' en bas de l'écran. Tu peux créer ta propre ligue et inviter tes amis avec un code, ou rejoindre une ligue existante.",
    },
    {
      title: "2. Faire tes pronostics",
      description:
        "Avant chaque Grand Prix, rends-toi dans l'onglet 'Pronos'. Tu dois pronostiquer la pole position, le top 10 des qualifications, le vainqueur, le top 10 de la course et les bonus.",
    },
    {
      title: "3. Weekend Sprint",
      description:
        "Lors d'un weekend sprint, tu as deux séries de pronostics à faire : une pour le sprint (clôture avant SQ1) et une pour la course principale (clôture avant Q1).",
    },
    {
      title: "4. Les Bonus",
      description:
        "N'oublie pas les paris bonus : Safety Car (oui/non), pilotes abandons (DNF), meilleur tour en course, et leader au premier virage. Ils peuvent rapporter gros !",
    },
    {
      title: "5. Gagner des points",
      description:
        "Après chaque course, les résultats sont entrés et tes points sont calculés automatiquement. Consulte ton historique dans ton profil pour voir le détail.",
    },
    {
      title: "6. Mini-jeux",
      description:
        "Joue aux mini-jeux (Reaction et Batak) pour gagner des points bonus et défier tes amis. Le meilleur de chaque ligue gagne +2 points !",
    },
    {
      title: "7. Classement",
      description:
        "Suis ton classement dans ta ligue et au niveau mondial. Domine tes amis et deviens le champion de la saison !",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={BookOpen}
        title="Tutoriel"
        subtitle="Comment jouer à PRONOKIF"
        color="from-cyan-500 to-cyan-700"
      />
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <h4 className="font-heading text-sm text-cyan-400 mb-1">{step.title}</h4>
            <p className="font-body text-xs text-gray-300 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Rules Content
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

// Scoring Content
export function ScoringContent() {
  const mainScoring = [
    {
      category: "Qualifications",
      items: [
        { label: "Pole Position exacte", points: "+5 pts" },
        { label: "Pilote dans le Top 10 (bonne position)", points: "+3 pts" },
        { label: "Pilote dans le Top 10 (mauvaise position)", points: "+1 pt" },
      ],
    },
    {
      category: "Course",
      items: [
        { label: "Vainqueur exact", points: "+5 pts" },
        { label: "Pilote dans le Top 10 (bonne position)", points: "+3 pts" },
        { label: "Pilote dans le Top 10 (mauvaise position)", points: "+1 pt" },
      ],
    },
  ];
  const bonusScoring = [
    { label: "Safety Car (bonne réponse)", points: "+3 pts" },
    { label: "Meilleur tour exact", points: "+5 pts" },
    { label: "Leader 1er virage exact", points: "+5 pts" },
    { label: "Abandon correct (par pilote)", points: "+3 pts" },
    { label: '"Pas de DNF" correct', points: "+5 pts" },
  ];
  const specialScoring = [
    { label: "Top 10 Qualifs parfait (10/10 bonnes positions)", points: "+10 pts BONUS" },
    { label: "Top 10 Course parfait (10/10 bonnes positions)", points: "+10 pts BONUS" },
    { label: "Meilleur score mini-jeu de la ligue", points: "+2 pts" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Calculator}
        title="Barème des points"
        subtitle="Comment sont calculés les points"
        color="from-purple-500 to-purple-700"
      />
      <div className="space-y-4">
        {mainScoring.map((section, idx) => (
          <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-purple-500/20">
            <h4 className="font-heading text-sm text-purple-400 mb-3">{section.category}</h4>
            <div className="space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-body text-xs text-gray-300">{item.label}</span>
                  <span className="font-data text-sm text-cyan-400 font-semibold">
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-yellow-500/20">
          <h4 className="font-heading text-sm text-yellow-400 mb-3">Paris Bonus</h4>
          <div className="space-y-2">
            {bonusScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-body text-xs text-gray-300">{item.label}</span>
                <span className="font-data text-sm text-yellow-400 font-semibold">
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-lg p-3 border border-cyan-500/30">
          <h4 className="font-heading text-sm text-cyan-400 mb-3">Bonus Spéciaux</h4>
          <div className="space-y-2">
            {specialScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-body text-xs text-gray-300">{item.label}</span>
                <span className="font-data text-sm text-green-400 font-semibold">
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
          <p className="font-body text-xs text-gray-400">
            <span className="text-orange-400 font-semibold">Weekend Sprint :</span> Le même barème
            s'applique pour les pronostics Sprint (Sprint Qualifs + Sprint Race + Bonus Sprint).
          </p>
        </div>
        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg p-3 border border-yellow-500/30">
          <h4 className="font-heading text-sm text-yellow-400 mb-2">
            Points maximum par GP (course classique)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-400">Qualifs (Pole + Top 10 parfait)</div>
            <div className="text-right text-cyan-400 font-semibold">45 pts</div>
            <div className="text-gray-400">Course (Winner + Top 10 parfait)</div>
            <div className="text-right text-cyan-400 font-semibold">45 pts</div>
            <div className="text-gray-400">Bonus (SC + FL + T1 + DNF)</div>
            <div className="text-right text-yellow-400 font-semibold">~20 pts</div>
            <div className="text-gray-400 font-semibold border-t border-gray-700 pt-1">
              Total possible
            </div>
            <div className="text-right text-green-400 font-bold border-t border-gray-700 pt-1">
              ~110 pts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Privacy Content
export function PrivacyContent() {
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Shield}
        title="Confidentialité"
        subtitle="Protection des données"
        color="from-green-500 to-green-700"
      />
      <div className="space-y-4 font-body text-sm text-gray-300 leading-relaxed">
        <section>
          <h4 className="font-heading text-sm text-green-400 mb-2">Données collectées</h4>
          <p>
            PRONOKIF collecte uniquement les données nécessaires au fonctionnement de l'application
            :
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Adresse email (pour l'authentification)</li>
            <li>Pseudo (pour l'affichage dans les classements)</li>
            <li>Pronostics et scores de jeux</li>
            <li>Appartenance aux ligues</li>
          </ul>
        </section>
        <section>
          <h4 className="font-heading text-sm text-green-400 mb-2">Utilisation des données</h4>
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Gérer votre compte et vos pronostics</li>
            <li>Calculer et afficher les classements</li>
            <li>Permettre les interactions entre membres (chat, ligues)</li>
          </ul>
        </section>
        <section>
          <h4 className="font-heading text-sm text-green-400 mb-2">Sécurité</h4>
          <p>Vos données sont protégées :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Mots de passe chiffrés (bcrypt)</li>
            <li>Connexion sécurisée (HTTPS)</li>
            <li>Aucune donnée vendue à des tiers</li>
          </ul>
        </section>
        <section>
          <h4 className="font-heading text-sm text-green-400 mb-2">Vos droits</h4>
          <p>Conformément au RGPD, vous pouvez :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Accéder à vos données personnelles</li>
            <li>Demander la modification ou suppression</li>
            <li>Exporter vos données</li>
          </ul>
          <p className="mt-2 text-gray-400">
            Contactez-nous à <span className="text-green-400">pronokif@gmail.com</span> pour exercer
            vos droits.
          </p>
        </section>
      </div>
    </div>
  );
}

// Legal Content
export function LegalContent() {
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={FileText}
        title="Mentions légales"
        subtitle="Informations juridiques"
        color="from-yellow-500 to-yellow-700"
      />
      <div className="space-y-4 font-body text-sm text-gray-300 leading-relaxed">
        <section>
          <h4 className="font-heading text-sm text-yellow-400 mb-2">Éditeur de l'application</h4>
          <p>
            PRONOKIF est une application de jeu gratuite et non commerciale, créée par un passionné
            de Formule 1.
          </p>
          <p className="mt-2 text-gray-400">
            Contact : <span className="text-yellow-400">pronokif@gmail.com</span>
          </p>
        </section>
        <section>
          <h4 className="font-heading text-sm text-yellow-400 mb-2">Hébergement</h4>
          <p>L'application est hébergée sur la plateforme Emergent.</p>
        </section>
        <section>
          <h4 className="font-heading text-sm text-yellow-400 mb-2">Propriété intellectuelle</h4>
          <p>
            PRONOKIF n'est pas affilié à la Formule 1, FIA, ou FOM. Les marques, logos et noms de
            pilotes/écuries appartiennent à leurs propriétaires respectifs.
          </p>
          <p className="mt-2">
            Les éléments graphiques et le code de l'application sont la propriété de l'éditeur.
          </p>
        </section>
        <section>
          <h4 className="font-heading text-sm text-yellow-400 mb-2">Responsabilité</h4>
          <p>
            PRONOKIF est un jeu de pronostics sans enjeu financier. L'éditeur décline toute
            responsabilité quant à l'utilisation de l'application.
          </p>
        </section>
        <section>
          <h4 className="font-heading text-sm text-yellow-400 mb-2">Conditions d'utilisation</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>L'application est gratuite et le restera</li>
            <li>L'inscription implique l'acceptation des règles</li>
            <li>Tout comportement inapproprié peut entraîner une exclusion</li>
            <li>L'administrateur se réserve le droit de modifier les règles</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

// Contact Content
export function ContactContent() {
  const handleEmailClick = () => {
    window.location.href = "mailto:pronokif@gmail.com?subject=Contact PRONOKIF";
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Mail}
        title="Contact"
        subtitle="Nous contacter"
        color="from-pink-500 to-pink-700"
      />
      <div className="space-y-4">
        <p className="font-body text-sm text-gray-300 leading-relaxed">
          Une question, une suggestion, un bug à signaler ? N'hésite pas à contacter
          l'administrateur de PRONOKIF.
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-pink-500/20">
          <p className="font-body text-xs text-gray-400 mb-2">Adresse email</p>
          <p className="font-data text-lg text-pink-400">pronokif@gmail.com</p>
        </div>
        <Button
          onClick={handleEmailClick}
          className="w-full h-12 bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-400 hover:to-pink-600 text-white font-heading uppercase"
        >
          <Mail className="w-5 h-5 mr-2" /> Envoyer un email{" "}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
        <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
          <p className="font-body text-xs text-gray-400">
            💡 Tu peux aussi utiliser le bouton <span className="text-cyan-400">?</span> en haut à
            droite de l'écran pour envoyer un feedback rapide directement depuis l'application.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helpers
interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
}

function SectionHeader({ icon: Icon, title, subtitle, color }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="font-heading text-lg text-white uppercase">{title}</h3>
        <p className="font-body text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

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
