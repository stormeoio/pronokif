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
      title: "1. Create or join a league",
      description:
        "Tap the Leagues tab at the bottom of the screen. You can create your own league and invite friends with a code, or join an existing league.",
    },
    {
      title: "2. Make your predictions",
      description:
        "Before each Grand Prix, go to the Picks tab. Predict pole position, the qualifying top 10, the winner, the race top 10, and bonuses.",
    },
    {
      title: "3. Week-end Sprint",
      description:
        "During a Sprint weekend, you have two sets of predictions: one for the sprint (closes before SQ1) and one for the main race (closes before Q1).",
    },
    {
      title: "4. Bonus",
      description:
        "N'oublie pas les paris bonus : Safety Car (oui/non), pilotes abandons (DNF), meilleur tour, et leader au premier virage. Ils peuvent rapporter gros.",
    },
    {
      title: "5. Marque des points",
      description:
        "After each race, results are entered and your points are calculated automatically. Check your profile history for the details.",
    },
    {
      title: "6. Mini-jeux",
      description:
        "Play mini-games (Reaction and Batak) to earn bonus points and challenge your friends. The best player in each league wins +2 points!",
    },
    {
      title: "7. Classement",
      description:
        "Track your league and global standings. Beat your friends and become the season champion.",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={BookOpen}
        title="Tutorial"
        subtitle="How to play PRONOKIF"
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
        title="Privacy"
        subtitle="Data protection"
        color="bg-pk-emerald"
      />
      <div className="space-y-4 text-sm text-pk-piste/80 leading-relaxed">
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Data collected</h4>
          <p>PRONOKIF only collects the data needed to run the app:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Email address (for authentication)</li>
            <li>Username (for leaderboard display)</li>
            <li>Pickstics et scores de jeu</li>
            <li>Appartenances aux ligues</li>
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Data usage</h4>
          <p>Your data is used exclusively to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Manage your account and predictions</li>
            <li>Calculer et afficher les classements</li>
            <li>Permettre les interactions entre membres (chat, ligues)</li>
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Security</h4>
          <p>Your data is protected:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Encrypted passwords (bcrypt)</li>
            <li>Secure sign-in (HTTPS)</li>
            <li>No data sold to third parties</li>
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">Vos droits</h4>
          <p>Under GDPR, you can:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            <li>Access your personal data</li>
            <li>Demander des modifications ou la suppression</li>
            <li>Export your data</li>
          </ul>
          <p className="mt-2 text-pk-titane">
            Contact us at <span className="text-pk-emerald">pronokif@gmail.com</span> to exercise
            your rights.
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
        title="Legal notice"
        subtitle="Informations juridiques"
        color="bg-pk-amber"
      />
      <div className="space-y-4 text-sm text-pk-piste/80 leading-relaxed">
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">App publisher</h4>
          <p>PRONOKIF is a free, non-commercial game app created by a Formula 1 enthusiast.</p>
          <p className="mt-2 text-pk-titane">
            Contact : <span className="text-pk-amber">pronokif@gmail.com</span>
          </p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Hosting</h4>
          <p>The app is hosted on the Emergent platform.</p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Intellectual property</h4>
          <p>
            PRONOKIF is not affiliated with Formula 1, the FIA, or FOM. Trademarks, logos, and names
            of drivers/teams belong to their respective owners.
          </p>
          <p className="mt-2">The app graphics and code are the property of the publisher.</p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Liability</h4>
          <p>
            PRONOKIF is a prediction game with no financial stakes. The publisher declines any
            liability for use of the app.
          </p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">Conditions d'utilisation</h4>
          <ul className="list-disc list-inside space-y-1 text-pk-titane">
            <li>L'application est gratuite et le restera</li>
            <li>Registration implies acceptance of the rules</li>
            <li>Inappropriate behavior may lead to exclusion</li>
            <li>The administrator reserves the right to change the rules</li>
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
      <SectionHeader icon={Mail} title="Contact" subtitle="Contactez-nous" color="bg-pk-red" />
      <div className="space-y-4">
        <p className="text-sm text-pk-piste/80 leading-relaxed">
          Question, suggestion, or bug to report? Feel free to contact the PRONOKIF administrator.
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
          <Mail className="w-5 h-5" /> Send an email <ExternalLink className="w-4 h-4" />
        </button>
        <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.08]">
          <p className="text-xs text-pk-titane">
            You can also use the <span className="text-pk-info">?</span> button at the top right of
            the screen to send quick feedback directly from the app.
          </p>
        </div>
      </div>
    </div>
  );
}
