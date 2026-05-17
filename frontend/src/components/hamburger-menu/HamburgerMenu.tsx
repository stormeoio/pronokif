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
import {
  TutorialContent,
  RulesContent,
  ScoringContent,
  PrivacyContent,
  LegalContent,
  ContactContent,
} from "./MenuSections";

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const menuItems = [
    { id: "tutorial", icon: BookOpen, label: "Tutoriel", color: "text-cyan-400" },
    { id: "rules", icon: Trophy, label: "Règles du jeu", color: "text-orange-400" },
    { id: "scoring", icon: Calculator, label: "Barème des points", color: "text-purple-400" },
    { id: "privacy", icon: Shield, label: "Confidentialité", color: "text-green-400" },
    { id: "legal", icon: FileText, label: "Mentions légales", color: "text-yellow-400" },
    { id: "contact", icon: Mail, label: "Contact", color: "text-pink-400" },
  ];

  const closeMenu = () => {
    setIsOpen(false);
    setActiveSection(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={isOpen}
        className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
        aria-label="Menu principal"
        className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-[#0a1628] border-r border-cyan-500/20 z-50"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      >
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="font-heading text-lg text-white uppercase tracking-wider">Menu</h2>
          <button
            onClick={closeMenu}
            aria-label="Fermer le menu"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
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
                  onClick={() => setActiveSection(item.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 rounded-lg transition-colors group"
                  variants={{ hidden: { opacity: 0, x: -15 }, visible: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.97 }}
                  data-testid={`menu-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center ${item.color}`}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-body text-white group-hover:text-cyan-400 transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
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
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 font-body text-sm"
                whileHover={{ x: -4 }}
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> Retour
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
