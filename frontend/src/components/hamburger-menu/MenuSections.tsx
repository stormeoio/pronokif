/**
 * MenuSections — Content sections for the hamburger menu.
 * Broadcast Premium: pk-surface cards, pk-* section accents, native elements.
 */
import { motion } from "framer-motion";
import { Shield, FileText, Mail, BookOpen, ExternalLink } from "lucide-react";
import { SectionHeader } from "./MenuHelpers";

// Re-export extracted content components
export { RulesContent } from "./RulesContent";
export { ScoringContent } from "./ScoringContent";

// Tutorial Content
export function TutorialContent() {
  const steps = [
    {
      title: "1. Crée ou rejoins une ligue",
      description:
        "Appuie sur l'onglet Ligues en bas de l'écran. Tu peux créer ta propre ligue et inviter tes potes avec un code, ou rejoindre une ligue existante.",
    },
    {
      title: "2. Fais tes pronostics",
      description:
        "Avant chaque Grand Prix, va dans l'onglet Pronos. Prédi la pole position, le top 10 des qualifications, le vainqueur, le top 10 de la course, et les bonus.",
    },
    {
      title: "3. Week-end Sprint",
      description:
        "Lors d'un week-end Sprint, tu as deux séries de pronostics : une pour le sprint (ferme avant SQ1) et une pour la course principale (ferme avant Q1).",
    },
    {
      title: "4. Bonus",
      description:
        "N'oublie pas les paris bonus : Safety Car (oui/non), pilotes abandons (DNF), meilleur tour, et leader au premier virage. Ils peuvent rapporter gros.",
    },
    {
      title: "5. Marque des points",
      description:
        "Après chaque course, les résultats sont saisis et tes points sont calculés automatiquement. Consulte l'historique de ton profil pour les détails.",
    },
    {
      title: "6. Mini-jeux",
      description:
        "Joue aux mini-jeux (Réaction et Batak) pour gagner des points bonus et défier tes potes. Le meilleur joueur de chaque ligue gagne +2 points !",
    },
    {
      title: "7. Classement",
      description:
        "Suis le classement de ta ligue et le classement général. Bats tes potes et deviens le champion de la saison.",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={BookOpen}
        title="Tutoriel"
        subtitle="Comment jouer à PRONOKIF"
        color="bg-pk-info"
      />
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {steps.map((step, index) => (
          <motion.div
            key={index}
            className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.08]"
            variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
          >
            <h4 className="font-display text-xs text-pk-info mb-1">{step.title}</h4>
            <p className="text-xs text-pk-piste/80 leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </motion.div>
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
        color="bg-pk-emerald"
      />
      <div className="space-y-4 text-sm text-pk-piste/80 leading-relaxed">
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Données collectées</h4>
          <p>PRONOKIF ne collecte que les données nécessaires au fonctionnement de l'appli :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Adresse email (pour l'authentification)</li>
            <li>Pseudo (pour l'affichage au classement)</li>
            <li>Pronostics et scores de jeu</li>
            <li>Appartenances aux ligues</li>
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Utilisation des données</h4>
          <p>Tes données sont utilisées exclusivement pour :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Gérer ton compte et tes pronostics</li>
            <li>Calculer et afficher les classements</li>
            <li>Permettre les interactions entre membres (chat, ligues)</li>
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Sécurité</h4>
          <p>Tes données sont protégées :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Mots de passe chiffrés (bcrypt)</li>
            <li>Connexion sécurisée (HTTPS)</li>
            <li>Aucune donnée vendue à des tiers</li>
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Tes droits</h4>
          <p>Conformément au RGPD, tu peux :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Accéder à tes données personnelles</li>
            <li>Demander des modifications ou la suppression</li>
            <li>Exporter tes données</li>
          </ul>
          <p className="mt-2 text-pk-titane">
            Contacte-nous à <span className="text-pk-emerald">pronokif@gmail.com</span> pour exercer
            tes droits.
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
        color="bg-pk-amber"
      />
      <div className="space-y-4 text-sm text-pk-piste/80 leading-relaxed">
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Éditeur de l'appli</h4>
          <p>
            PRONOKIF est une appli de jeu gratuite et non commerciale, créée par un passionné de
            Formule 1.
          </p>
          <p className="mt-2 text-pk-titane">
            Contact : <span className="text-pk-amber">pronokif@gmail.com</span>
          </p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Hébergement</h4>
          <p>L'application est hébergée sur la plateforme Emergent.</p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Propriété intellectuelle</h4>
          <p>
            PRONOKIF n'est pas affilié à la Formule 1, la FIA ou FOM. Les marques, logos et noms de
            pilotes/écuries appartiennent à leurs propriétaires respectifs.
          </p>
          <p className="mt-2">Les visuels et le code de l'appli sont la propriété de l'éditeur.</p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Responsabilité</h4>
          <p>
            PRONOKIF est un jeu de pronostics sans enjeu financier. L'éditeur décline toute
            responsabilité quant à l'utilisation de l'appli.
          </p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Conditions d'utilisation</h4>
          <ul className="list-disc list-inside space-y-1 text-pk-titane">
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
      <SectionHeader icon={Mail} title="Contact" subtitle="Écris-nous" color="bg-pk-red" />
      <div className="space-y-4">
        <p className="text-sm text-pk-piste/80 leading-relaxed">
          Une question, une suggestion ou un bug à signaler ? N'hésite pas à contacter
          l'administrateur de PRONOKIF.
        </p>
        <div className="bg-white/[0.04] rounded-lg p-4 border border-pk-red/20">
          <p className="font-data text-[0.5625rem] text-pk-titane mb-2">Adresse email</p>
          <p className="font-data text-lg text-pk-red">pronokif@gmail.com</p>
        </div>
        <button
          onClick={handleEmailClick}
          className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
          data-testid="contact-email-btn"
        >
          <Mail className="w-5 h-5" /> Envoyer un email <ExternalLink className="w-4 h-4" />
        </button>
        <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.08]">
          <p className="text-xs text-pk-titane">
            Tu peux aussi utiliser le bouton <span className="text-pk-info">?</span> en haut à
            droite de l'écran pour envoyer un retour rapide directement depuis l'appli.
          </p>
        </div>
      </div>
    </div>
  );
}
