import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import PronoKifSplashScreen from "@/components/splash/PronoKifSplashScreen";
import { brandAssets } from "@/lib/brand";

// ----------------------------------------------------------- props ---

interface SplashScreenProps {
  /** Called when splash finishes, is skipped, or the user starts the app. */
  onComplete: () => void;
  /** App icon source shown in the branded splash overlay. */
  iconSrc?: string;
  /** Horizontal logo source shown under the app icon. */
  wordmarkSrc?: string;
  /** Video source path (default: /video/splash-trailer.mp4) */
  videoSrc?: string;
  /** Max duration before auto-skip (ms) */
  maxDuration?: number;
  /** Delay before showing the brand overlay. */
  introDelayMs?: number;
  /** Delay before replacing the loader with the start CTA. */
  buttonDelayMs?: number;
  /** True when critical app resources are loaded. Button waits for this. */
  appReady?: boolean;
}

// ----------------------------------------------------------- helpers ---

/** Read cached user from localStorage (set by useAppPreload). */
function getCachedUser(): { username?: string; current_league_id?: string } | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isAdminRoute(): boolean {
  const p = window.location.pathname;
  return p.startsWith("/admin") || p.startsWith("/bo-admin") || p.startsWith("/admin-bo");
}

// ----------------------------------------------------------- component ---

export default function SplashScreen({
  onComplete,
  iconSrc = brandAssets.pwaIcon512,
  wordmarkSrc = brandAssets.wordmarkWhiteRed,
  videoSrc = "/video/splash-trailer.mp4",
  maxDuration = 13000,
  introDelayMs = 950,
  buttonDelayMs = 3600,
  appReady,
}: SplashScreenProps) {
  const { t } = useTranslation();

  const ctaLabel = useMemo(() => {
    if (isAdminRoute()) return t("splash.start_admin");
    const user = getCachedUser();
    if (user) return t("splash.start_dashboard");
    return t("splash.start_login");
  }, [t]);

  return (
    <PronoKifSplashScreen
      iconSrc={iconSrc}
      wordmarkSrc={wordmarkSrc}
      videoSrc={videoSrc}
      baseline={t("splash.baseline")}
      loadingLabel={t("splash.loading_label")}
      loadingLogs={t("splash.logs", { returnObjects: true }) as string[]}
      skipLabel={t("splash.skip")}
      ctaLabel={ctaLabel}
      ariaContent={t("splash.aria_content")}
      ariaLoading={t("splash.aria_loading")}
      ariaSteps={t("splash.aria_steps")}
      introDelayMs={introDelayMs}
      buttonDelayMs={buttonDelayMs}
      maxDurationMs={maxDuration}
      appReady={appReady}
      onStart={onComplete}
    />
  );
}
