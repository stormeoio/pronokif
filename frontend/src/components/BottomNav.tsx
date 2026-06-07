import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { navIcons, iconProps } from "@/lib/icons";
import { quickEnter } from "@/lib/motion";

// ----------------------------------------------------------- types ---

interface NavItemDef {
  path: string;
  icon: keyof typeof navIcons;
  labelKey: string;
}

// ----------------------------------------------------------- config ---

const NAV_ITEMS_KEYS: NavItemDef[] = [
  { path: "/", icon: "accueil", labelKey: "nav.home" },
  { path: "/predictions", icon: "pronostics", labelKey: "nav.preds_short" },
  { path: "/live", icon: "direct", labelKey: "nav.live" },
  { path: "/leaderboard", icon: "classements", labelKey: "nav.standings" },
  { path: "/profile", icon: "profil", labelKey: "nav.profile" },
];

// ----------------------------------------------------------- component ---

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto"
      aria-label={t("nav.aria_label")}
      data-testid="bottom-nav"
    >
      <div
        className="flex items-center justify-around
          h-16 pb-[env(safe-area-inset-bottom,0px)]
          bg-pk-carbon/[0.94] backdrop-blur-[24px] saturate-[1.4]
          border-t border-white/[0.08]"
      >
        {NAV_ITEMS_KEYS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = navIcons[item.icon];
          const label = t(item.labelKey);

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                w-[52px] h-[52px]
                transition-colors duration-pk-short ease-pk-enter
                ${isActive ? "text-pk-red" : "text-pk-titane hover:text-pk-piste/70"}
              `}
              data-testid={`nav-${item.icon}`}
              whileTap={{ scale: 0.88 }}
              transition={quickEnter}
            >
              {/* Active indicator dot */}
              {isActive && (
                <motion.span
                  className="absolute top-1.5 w-1 h-1 rounded-full bg-pk-red
                    shadow-[0_0_6px_rgba(225,6,0,0.5)]"
                  layoutId="nav-dot"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}

              <Icon
                {...iconProps}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? "drop-shadow-[0_0_4px_rgba(225,6,0,0.4)]" : ""}
              />

              <span className="font-mono text-[9px] uppercase tracking-[0.06em] leading-none">
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
