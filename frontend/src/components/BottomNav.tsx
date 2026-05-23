import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { navIcons, iconProps } from "@/lib/icons";
import { quickEnter } from "@/lib/motion";

// ----------------------------------------------------------- types ---

interface NavItemDef {
  path: string;
  icon: keyof typeof navIcons;
  label: string;
}

// ----------------------------------------------------------- config ---

const NAV_ITEMS: NavItemDef[] = [
  { path: "/", icon: "accueil", label: "Accueil" },
  { path: "/predictions", icon: "pronostics", label: "Pronos" },
  { path: "/live", icon: "direct", label: "Direct" },
  { path: "/leaderboard", icon: "classements", label: "Classements" },
  { path: "/profile", icon: "profil", label: "Profil" },
];

// ----------------------------------------------------------- component ---

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto"
      aria-label="Navigation principale"
      data-testid="bottom-nav"
    >
      <div
        className="flex items-center justify-around
          h-16 pb-[env(safe-area-inset-bottom,0px)]
          bg-pk-carbon/[0.94] backdrop-blur-[24px] saturate-[1.4]
          border-t border-white/[0.08]"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = navIcons[item.icon];

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                w-[52px] h-[52px]
                transition-colors duration-pk-short ease-pk-enter
                ${isActive ? "text-pk-red" : "text-pk-titane hover:text-pk-piste/70"}
              `}
              data-testid={`nav-${item.label.toLowerCase()}`}
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
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
