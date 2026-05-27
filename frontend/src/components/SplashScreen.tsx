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
}: SplashScreenProps) {
  return (
    <PronoKifSplashScreen
      iconSrc={iconSrc}
      wordmarkSrc={wordmarkSrc}
      videoSrc={videoSrc}
      introDelayMs={introDelayMs}
      buttonDelayMs={buttonDelayMs}
      maxDurationMs={maxDuration}
      onStart={onComplete}
    />
  );
}
