import { motion } from "framer-motion";
import { Shield, FileText, Mail, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { SectionHeader } from "./MenuHelpers";

// Re-export extracted content components
export { RulesContent } from "./RulesContent";
export { ScoringContent } from "./ScoringContent";

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
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {steps.map((step, index) => (
          <motion.div
            key={index}
            className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
            variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
          >
            <h4 className="font-heading text-sm text-cyan-400 mb-1">{step.title}</h4>
            <p className="font-body text-xs text-gray-300 leading-relaxed">{step.description}</p>
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
