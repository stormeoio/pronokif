/**
 * MenuSections — Content sections for the hamburger menu.
 * Broadcast Premium: pk-surface cards, pk-* section accents, native elements.
 */
import { motion } from "framer-motion";
import { Shield, FileText, Mail, BookOpen, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "./MenuHelpers";

// Re-export extracted content components
export { RulesContent } from "./RulesContent";
export { ScoringContent } from "./ScoringContent";

// Tutorial Content
export function TutorialContent() {
  const { t } = useTranslation();
  const steps = t("menu.tutorial.steps", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={BookOpen}
        title={t("menu.tutorial.title")}
        subtitle={t("menu.tutorial.subtitle")}
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
  const { t } = useTranslation();
  const collectedItems = t("menu.privacy.collected_items", { returnObjects: true }) as string[];
  const usageItems = t("menu.privacy.usage_items", { returnObjects: true }) as string[];
  const securityItems = t("menu.privacy.security_items", { returnObjects: true }) as string[];
  const rightsItems = t("menu.privacy.rights_items", { returnObjects: true }) as string[];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Shield}
        title={t("menu.privacy.title")}
        subtitle={t("menu.privacy.subtitle")}
        color="bg-pk-emerald"
      />
      <div className="space-y-4 text-sm text-pk-piste/80 leading-relaxed">
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">
            {t("menu.privacy.collected_title")}
          </h4>
          <p>{t("menu.privacy.collected_intro")}</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            {collectedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">
            {t("menu.privacy.usage_title")}
          </h4>
          <p>{t("menu.privacy.usage_intro")}</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            {usageItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">
            {t("menu.privacy.security_title")}
          </h4>
          <p>{t("menu.privacy.security_intro")}</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            {securityItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-emerald mb-2">
            {t("menu.privacy.rights_title")}
          </h4>
          <p>{t("menu.privacy.rights_intro")}</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-pk-titane">
            {rightsItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-2 text-pk-titane">
            {t("menu.privacy.contact_prefix")}{" "}
            <span className="text-pk-emerald">pronokif@gmail.com</span>{" "}
            {t("menu.privacy.contact_suffix")}
          </p>
        </section>
      </div>
    </div>
  );
}

// Legal Content
export function LegalContent() {
  const { t } = useTranslation();
  const termsItems = t("menu.legal.terms_items", { returnObjects: true }) as string[];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={FileText}
        title={t("menu.legal.title")}
        subtitle={t("menu.legal.subtitle")}
        color="bg-pk-amber"
      />
      <div className="space-y-4 text-sm text-pk-piste/80 leading-relaxed">
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">
            {t("menu.legal.publisher_title")}
          </h4>
          <p>{t("menu.legal.publisher_text")}</p>
          <p className="mt-2 text-pk-titane">
            {t("menu.legal.contact_label")}{" "}
            <span className="text-pk-amber">pronokif@gmail.com</span>
          </p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">
            {t("menu.legal.hosting_title")}
          </h4>
          <p>{t("menu.legal.hosting_text")}</p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">{t("menu.legal.ip_title")}</h4>
          <p>{t("menu.legal.ip_text")}</p>
          <p className="mt-2">{t("menu.legal.ip_owner")}</p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">
            {t("menu.legal.liability_title")}
          </h4>
          <p>{t("menu.legal.liability_text")}</p>
        </section>
        <section>
          <h4 className="font-display text-xs text-pk-amber mb-2">{t("menu.legal.terms_title")}</h4>
          <ul className="list-disc list-inside space-y-1 text-pk-titane">
            {termsItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// Contact Content
export function ContactContent() {
  const { t } = useTranslation();
  const handleEmailClick = () => {
    window.location.href = "mailto:pronokif@gmail.com?subject=Contact PRONOKIF";
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Mail}
        title={t("menu.contact.title")}
        subtitle={t("menu.contact.subtitle")}
        color="bg-pk-red"
      />
      <div className="space-y-4">
        <p className="text-sm text-pk-piste/80 leading-relaxed">{t("menu.contact.intro")}</p>
        <div className="bg-white/[0.04] rounded-lg p-4 border border-pk-red/20">
          <p className="font-data text-[0.5625rem] text-pk-titane mb-2">
            {t("menu.contact.email_label")}
          </p>
          <p className="font-data text-lg text-pk-red">pronokif@gmail.com</p>
        </div>
        <button
          onClick={handleEmailClick}
          className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
          data-testid="contact-email-btn"
        >
          <Mail className="w-5 h-5" /> {t("menu.contact.send_email")}{" "}
          <ExternalLink className="w-4 h-4" />
        </button>
        <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.08]">
          <p className="text-xs text-pk-titane">
            {t("menu.contact.quick_feedback_prefix")} <span className="text-pk-info">?</span>{" "}
            {t("menu.contact.quick_feedback_suffix")}
          </p>
        </div>
      </div>
    </div>
  );
}
