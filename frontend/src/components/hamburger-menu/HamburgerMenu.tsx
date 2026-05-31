/**
 * HamburgerMenu — Slide-out navigation menu with content sections.
 * Broadcast Premium: pk-carbon panel, pk-info accents, stagger animations.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Shield,
  FileText,
  Mail,
  BookOpen,
  ChevronRight,
  Trophy,
  Calculator,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  TutorialContent,
  RulesContent,
  ScoringContent,
  PrivacyContent,
  LegalContent,
  ContactContent,
} from "./MenuSections";
import { useBranding } from "@/lib/branding";
import { haptic } from "@/lib/haptics";

export default function HamburgerMenu() {
  const { t } = useTranslation();
  const { assets } = useBranding();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const menuItems = [
    { id: "tutorial", icon: BookOpen, label: t("menu.tutorial.title"), color: "text-pk-info" },
    { id: "rules", icon: Trophy, label: t("menu.rules.title"), color: "text-pk-amber" },
    { id: "scoring", icon: Calculator, label: t("menu.scoring.title"), color: "text-pk-info" },
    { id: "privacy", icon: Shield, label: t("menu.privacy.title"), color: "text-pk-emerald" },
    { id: "legal", icon: FileText, label: t("menu.legal.title"), color: "text-pk-amber" },
    { id: "contact", icon: Mail, label: t("menu.contact.title"), color: "text-pk-red" },
  ];

  const closeMenu = () => {
    setIsOpen(false);
    setActiveSection(null);
  };

  return (
    <>
      <button
        onClick={() => {
          haptic("light");
          setIsOpen(true);
        }}
        aria-label={t("menu.hamburger.open")}
        aria-expanded={isOpen}
        className="p-2 rounded-lg text-pk-titane hover:text-pk-piste hover:bg-white/[0.04] transition-colors"
        data-testid="hamburger-menu-btn"
      >
        <Menu className="w-6 h-6" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label={t("menu.hamburger.dialog")}
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-pk-carbon border-r border-white/[0.08] z-50"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          >
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="min-w-0">
                <img
                  src={assets.wordmarkDark}
                  alt="PronoKif"
                  className="h-6 w-auto max-w-[150px] object-contain"
                  draggable={false}
                />
                <h2 className="sr-only">{t("menu.hamburger.menu")}</h2>
              </div>
              <button
                onClick={closeMenu}
                aria-label={t("menu.hamburger.close")}
                className="p-1.5 rounded-lg text-pk-titane hover:text-pk-piste hover:bg-white/[0.04] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto h-[calc(100%-60px)] pb-24">
              {!activeSection ? (
                <motion.div
                  className="p-2"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
                >
                  {menuItems.map((item) => (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        haptic("light");
                        setActiveSection(item.id);
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/[0.04] rounded-lg transition-colors group"
                      variants={{ hidden: { opacity: 0, x: -15 }, visible: { opacity: 1, x: 0 } }}
                      whileHover={{ x: 6 }}
                      whileTap={{ scale: 0.97 }}
                      data-testid={`menu-${item.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center ${item.color}`}
                        >
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm text-pk-piste group-hover:text-white transition-colors">
                          {item.label}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-pk-titane group-hover:text-pk-piste transition-colors" />
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  className="p-4 pb-32"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.button
                    onClick={() => setActiveSection(null)}
                    className="flex items-center gap-2 text-pk-info hover:text-pk-info/80 mb-4 text-sm"
                    whileHover={{ x: -4 }}
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" /> {t("menu.hamburger.back")}
                  </motion.button>
                  {activeSection === "tutorial" && <TutorialContent />}
                  {activeSection === "rules" && <RulesContent />}
                  {activeSection === "scoring" && <ScoringContent />}
                  {activeSection === "privacy" && <PrivacyContent />}
                  {activeSection === "legal" && <LegalContent />}
                  {activeSection === "contact" && <ContactContent />}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
