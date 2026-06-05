import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * PronoKif F1 splashscreen
 * ------------------------------------------------------------
 * Standalone React component: no Tailwind, no Framer Motion,
 * no external dependency besides React.
 *
 * Performance pass:
 * - Border glow animations are now transform-only.
 * - No animated clip-path.
 * - No animated CSS custom properties.
 * - Reduced expensive filters on moving elements.
 * - Stronger glow layers, but composited on GPU.
 *
 * Timeline:
 * 0s    -> intro video + centered progress bar start immediately
 * ~1s   -> app icon + wordmark + baseline appear
 * ~3.6s -> progress reaches 100% and morphs into "Commencer"
 */

type BorderGlowButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

type AppIconGlowProps = {
  iconSrc?: string;
  alt?: string;
  size?: number;
  radius?: number;
  className?: string;
};

type PronoKifSplashScreenProps = {
  iconSrc?: string;
  wordmarkSrc?: string;
  videoSrc?: string;
  posterSrc?: string;
  appName?: string;
  baseline?: string;
  loadingLabel?: string;
  loadingLogs?: string[];
  /** Label for the skip button (top-right). */
  skipLabel?: string;
  /** Label for the main CTA button that replaces the progress bar. */
  ctaLabel?: string;
  /** Aria label for the brand content section. */
  ariaContent?: string;
  /** Aria label for the loader dock section. */
  ariaLoading?: string;
  /** Aria label for the loading steps list. */
  ariaSteps?: string;
  introDelayMs?: number;
  buttonDelayMs?: number;
  /** True when critical app resources are loaded. Button waits for this. */
  appReady?: boolean;
  maxDurationMs?: number;
  onStart?: () => void;
  className?: string;
};

const DEFAULT_LOADING_LOGS = [
  "Initialisation du paddock",
  "Chargement du calendrier 2026",
  "Préparation des pronostics",
  "Ouverture de la grille",
];

export function BorderGlowButton({
  children,
  onClick,
  className = "",
  disabled = false,
}: BorderGlowButtonProps) {
  return (
    <button
      type="button"
      className={`pk-borderButton ${className}`}
      onClick={onClick}
      disabled={disabled}
      data-testid="splash-start"
    >
      <span className="pk-borderButton__halo" aria-hidden="true" />
      <span className="pk-borderButton__glow" aria-hidden="true" />
      <span className="pk-borderButton__inner">
        <span className="pk-borderButton__label">{children}</span>
      </span>
    </button>
  );
}

export function AppIconGlow({
  iconSrc,
  alt = "Icône PronoKif F1",
  size = 72,
  radius = 18,
  className = "",
}: AppIconGlowProps) {
  const styleVars = {
    "--pk-icon-size": `${size}px`,
    "--pk-radius": `${radius}px`,
  } as React.CSSProperties;

  return (
    <div className={`pk-appIcon ${className}`} style={styleVars} aria-label={alt}>
      <span className="pk-appIcon__aura" aria-hidden="true" />
      <span className="pk-appIcon__glowRing pk-appIcon__glowRing--wide" aria-hidden="true" />
      <span className="pk-appIcon__glowRing pk-appIcon__glowRing--sharp" aria-hidden="true" />
      <span className="pk-appIcon__edge" aria-hidden="true" />

      <div className="pk-appIcon__plate">
        <span className="pk-appIcon__shine" aria-hidden="true" />
        {iconSrc ? (
          <img className="pk-appIcon__image" src={iconSrc} alt={alt} draggable={false} />
        ) : (
          <div className="pk-appIcon__fallback" aria-hidden="true">
            <span>P</span>
            <span>K</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PronoKifSplashScreen({
  iconSrc = "/icons/icon-pronokif-v1-512.png",
  wordmarkSrc = "/brand/pronokif-v1/logo-pronokif-markdown-white-red.svg",
  videoSrc = "/video/splash-trailer.mp4",
  posterSrc,
  appName = "PronoKif F1",
  baseline = "Pronostique. Défie. Vibre.",
  loadingLabel = "Synchronisation paddock",
  loadingLogs = DEFAULT_LOADING_LOGS,
  skipLabel = "Passer",
  ctaLabel: _ctaLabel,
  ariaContent = "Écran de lancement PronoKif F1",
  ariaLoading = "Chargement de PronoKif F1",
  ariaSteps = "Étapes de chargement",
  introDelayMs = 950,
  buttonDelayMs = 3600,
  appReady = true,
  maxDurationMs = 13000,
  onStart,
  className = "",
}: PronoKifSplashScreenProps) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const ready = timerDone && appReady;
  const [isLeaving, setIsLeaving] = useState(false);
  const [activeLogIndex, setActiveLogIndex] = useState(0);
  const hasCompleteedRef = useRef(false);

  const completeSplash = useCallback(() => {
    if (hasCompleteedRef.current) return;
    hasCompleteedRef.current = true;
    setIsLeaving(true);
    window.setTimeout(() => onStart?.(), 620);
  }, [onStart]);

  useEffect(() => {
    const logoTimer = window.setTimeout(() => setLogoVisible(true), introDelayMs);
    const readyTimer = window.setTimeout(() => setTimerDone(true), buttonDelayMs);

    return () => {
      window.clearTimeout(logoTimer);
      window.clearTimeout(readyTimer);
    };
  }, [introDelayMs, buttonDelayMs]);

  const startupLogs = useMemo(() => loadingLogs.filter(Boolean), [loadingLogs]);

  useEffect(() => {
    if (ready || startupLogs.length <= 1) return undefined;

    const logTimer = window.setInterval(
      () => {
        setActiveLogIndex((index) => Math.min(index + 1, startupLogs.length - 1));
      },
      Math.max(buttonDelayMs / startupLogs.length, 560),
    );

    return () => window.clearInterval(logTimer);
  }, [buttonDelayMs, ready, startupLogs.length]);

  // Auto-redirect when loading completes — no manual tap required
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(completeSplash, 450);
    return () => window.clearTimeout(timer);
  }, [ready, completeSplash]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (media?.matches) {
      completeSplash();
    }
  }, [completeSplash]);

  useEffect(() => {
    const safetyTimer = window.setTimeout(completeSplash, maxDurationMs);
    return () => window.clearTimeout(safetyTimer);
  }, [completeSplash, maxDurationMs]);

  const progressDuration = useMemo(() => Math.max(buttonDelayMs, 1200), [buttonDelayMs]);

  return (
    <main className={`pk-splash ${isLeaving ? "is-leaving" : ""} ${className}`}>
      <style>{styles}</style>

      <div className="pk-splash__videoLayer" aria-hidden="true">
        <video
          className="pk-splash__video"
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          data-testid="splash-video"
          onError={() => {
            setLogoVisible(true);
            setTimerDone(true);
          }}
        />
        <div className="pk-splash__videoOverlay" />
      </div>

      <div className="pk-splash__background" aria-hidden="true">
        <div className="pk-splash__speedLines" />
        <div className="pk-splash__redFog pk-splash__redFog--left" />
        <div className="pk-splash__redFog pk-splash__redFog--right" />
      </div>

      <section
        className={`pk-splash__content ${logoVisible ? "is-visible" : ""}`}
        aria-label={ariaContent}
      >
        <AppIconGlow iconSrc={iconSrc} size={88} radius={20} />

        <div className="pk-splash__brandBlock">
          <h1 className="pk-splash__wordmark" aria-label={appName}>
            {wordmarkSrc ? (
              <img
                className="pk-splash__wordmarkImage"
                src={wordmarkSrc}
                alt=""
                draggable={false}
              />
            ) : (
              <span className="pk-splash__wordmarkFallback" aria-hidden="true">
                <span className="pk-splash__wordmarkWhite">Prono</span>
                <span className="pk-splash__wordmarkRed">Kif</span>
                <span className="pk-splash__wordmarkF1">F1</span>
              </span>
            )}
          </h1>
          <p className="pk-splash__baseline">{baseline}</p>
        </div>
      </section>

      <section
        className={`pk-splash__loaderDock ${logoVisible ? "has-logo" : ""} ${
          ready ? "is-ready" : ""
        }`}
        aria-label={ariaLoading}
      >
        <div className="pk-splash__actionZone">
          <div className="pk-progress" role="status" aria-live="polite">
            <div className="pk-progress__track">
              <div
                className="pk-progress__bar"
                style={{ animationDuration: `${progressDuration}ms` }}
              />
            </div>
            <div className="pk-progress__copy">
              <span className="pk-progress__label">{loadingLabel}</span>
              <div className="pk-progress__logs" aria-label={ariaSteps}>
                {startupLogs.map((log, index) => (
                  <span
                    key={log}
                    className={`pk-progress__log ${index <= activeLogIndex ? "is-active" : ""}`}
                  >
                    {log}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CTA button removed — auto-transition fires via the useEffect
              above when `ready` becomes true (450ms delay for a smooth exit).
              The maxDurationMs safety timer ensures the splash always clears. */}
        </div>
      </section>
    </main>
  );
}

const styles = `
:root {
  color-scheme: dark;
}

.pk-splash,
.pk-splash * {
  box-sizing: border-box;
}

.pk-splash {
  position: relative;
  min-height: 100svh;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 44px 30px;
  background: #020307;
  font-family: Chivo, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  isolation: isolate;
}

.pk-splash::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 80;
  pointer-events: none;
  opacity: 0;
  transform: translate3d(-110%, 0, 0);
  background:
    linear-gradient(
      90deg,
      transparent 0%,
      rgba(225, 6, 0, .04) 30%,
      rgba(225, 6, 0, .28) 47%,
      rgba(255, 255, 255, .82) 50%,
      rgba(225, 6, 0, .28) 53%,
      rgba(225, 6, 0, .04) 70%,
      transparent 100%
    );
}

.pk-splash.is-leaving::after {
  opacity: 1;
  animation: pkExitSweep 620ms cubic-bezier(.22, 1, .36, 1) forwards;
}

.pk-splash.is-leaving .pk-splash__videoLayer,
.pk-splash.is-leaving .pk-splash__background,
.pk-splash.is-leaving .pk-splash__content,
.pk-splash.is-leaving .pk-splash__loaderDock,
.pk-splash.is-leaving .pk-splash__skip {
  opacity: 0;
  filter: blur(10px);
  transform: scale(1.018);
  transition:
    opacity 520ms ease,
    filter 520ms ease,
    transform 520ms ease;
}

.pk-splash.is-leaving .pk-splash__loaderDock {
  transform: translate3d(-50%, -50%, 0) scale(1.018);
}

.pk-splash__videoLayer {
  position: absolute;
  inset: 0;
  z-index: -5;
  overflow: hidden;
  background: #020307;
}

.pk-splash__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: .78;
  filter: saturate(1.12) contrast(1.08) brightness(.76);
  transform: translateZ(0) scale(1.02);
  will-change: transform;
}

.pk-splash__videoOverlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 42%, rgba(255, 0, 0, .12), transparent 30%),
    radial-gradient(circle at 50% 88%, rgba(255, 0, 0, .2), transparent 28%),
    linear-gradient(180deg, rgba(0,0,0,.58) 0%, rgba(0,0,0,.24) 45%, rgba(0,0,0,.76) 100%),
    linear-gradient(90deg, rgba(0,0,0,.86), rgba(0,0,0,.26), rgba(0,0,0,.86));
}

.pk-splash__background {
  position: absolute;
  inset: 0;
  z-index: -4;
  pointer-events: none;
  overflow: hidden;
}

.pk-splash__speedLines {
  position: absolute;
  inset: -45%;
  opacity: .34;
  background:
    repeating-linear-gradient(
      115deg,
      transparent 0 48px,
      rgba(255, 255, 255, .06) 49px 50px,
      transparent 51px 96px,
      rgba(255, 0, 0, .16) 97px 100px,
      transparent 101px 142px
    );
  animation: pkSpeed 4.8s linear infinite;
  mask-image: radial-gradient(circle at 50% 46%, black 0 36%, transparent 74%);
  transform: translateZ(0);
  will-change: transform;
}

.pk-splash__redFog {
  position: absolute;
  width: 58vmin;
  aspect-ratio: 1;
  border-radius: 999px;
  background: #ff1616;
  opacity: .16;
  filter: blur(60px);
  animation: pkPulse 3s ease-in-out infinite alternate;
  transform: translateZ(0);
  will-change: transform, opacity;
}

.pk-splash__redFog--left {
  left: -14vmin;
  bottom: 4vmin;
}

.pk-splash__redFog--right {
  right: -18vmin;
  top: 12vmin;
  animation-delay: -1.2s;
}

.pk-splash__skip {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 16px);
  right: 16px;
  z-index: 20;
  min-height: 44px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  padding: 0 16px;
  color: rgba(255,255,255,.64);
  background: rgba(11,13,18,.46);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 14px 34px rgba(0,0,0,.32);
  backdrop-filter: blur(14px);
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease, transform 180ms ease;
}

.pk-splash__skip:hover {
  color: #fff;
  border-color: rgba(255,255,255,.2);
  background: rgba(26,29,36,.66);
  transform: translate3d(0, -1px, 0);
}

.pk-splash__skip:active {
  transform: translate3d(0, 1px, 0);
}

.pk-splash__content {
  width: min(460px, 100%);
  display: grid;
  justify-items: center;
  gap: 32px;
  opacity: 0;
  transform: translate3d(0, 28px, 0) scale(.94);
  filter: blur(18px);
  pointer-events: none;
  will-change: opacity, transform, filter;
}

.pk-splash__content.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  filter: blur(0);
  pointer-events: auto;
  transition:
    opacity 1050ms cubic-bezier(.2,.95,.18,1),
    transform 1050ms cubic-bezier(.2,.95,.18,1),
    filter 1050ms cubic-bezier(.2,.95,.18,1);
}

.pk-splash__brandBlock {
  display: grid;
  justify-items: center;
  gap: 14px;
  text-align: center;
}

.pk-splash__wordmark {
  margin: 0;
  line-height: 0;
  filter: drop-shadow(0 18px 28px rgba(0,0,0,.72));
}

.pk-splash__wordmarkImage {
  display: block;
  width: min(342px, 78vw);
  max-height: 72px;
  height: auto;
  object-fit: contain;
  user-select: none;
}

.pk-splash__wordmarkFallback {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: .035em;
  font-size: clamp(2.35rem, 10vw, 4.35rem);
  font-family: "Racing Sans One", Chivo, ui-sans-serif, system-ui, sans-serif;
  line-height: .9;
  letter-spacing: 0;
  font-weight: 400;
  text-transform: uppercase;
  transform: skewX(-8deg) translateZ(0);
}

.pk-splash__wordmarkWhite {
  background: linear-gradient(180deg, #fff 0%, #cfd2d5 46%, #777f87 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 1px 0 rgba(255,255,255,.48);
}

.pk-splash__wordmarkRed,
.pk-splash__wordmarkF1 {
  background: linear-gradient(180deg, #ff4a4a 0%, #ee0a0a 45%, #8d0202 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 24px rgba(255,0,0,.5);
}

.pk-splash__wordmarkF1 {
  margin-left: .14em;
  letter-spacing: 0;
  font-size: .72em;
}

.pk-splash__baseline {
  margin: 0;
  color: rgba(255,255,255,.82);
  font-size: clamp(.78rem, 2.8vw, .94rem);
  text-transform: uppercase;
  letter-spacing: .34em;
  text-shadow: 0 0 18px rgba(255,255,255,.12);
}

.pk-splash__loaderDock {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 14;
  width: min(316px, 78vw);
  display: grid;
  justify-items: center;
  transform: translate3d(-50%, -50%, 0);
  transition:
    top 720ms cubic-bezier(.22, 1, .36, 1),
    width 520ms cubic-bezier(.22, 1, .36, 1),
    transform 720ms cubic-bezier(.22, 1, .36, 1);
  will-change: top, transform;
}

.pk-splash__loaderDock.has-logo {
  top: calc(50% + 274px);
  width: min(306px, 76vw);
}

.pk-splash__actionZone {
  position: relative;
  width: 100%;
  min-height: 116px;
  display: grid;
  align-items: start;
  justify-items: center;
}

.pk-progress {
  grid-area: 1 / 1;
}

.pk-progress {
  width: 100%;
  display: grid;
  gap: 10px;
  justify-items: center;
  color: rgba(255,255,255,.62);
  font-size: .72rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  transition: opacity 360ms ease, transform 360ms ease;
  will-change: opacity, transform;
}

.pk-splash__loaderDock.is-ready .pk-progress {
  opacity: 0;
  transform: translate3d(0, -1px, 0) scale(.995);
  pointer-events: none;
  transition:
    opacity 320ms ease 130ms,
    transform 460ms cubic-bezier(.22, 1, .36, 1);
}

.pk-progress__track {
  position: relative;
  width: 100%;
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255,255,255,.12);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 0 24px rgba(255,0,0,.14);
  transform: translateZ(0);
  transition:
    height 460ms cubic-bezier(.22, 1, .36, 1),
    border-radius 460ms cubic-bezier(.22, 1, .36, 1),
    box-shadow 460ms cubic-bezier(.22, 1, .36, 1),
    background 460ms cubic-bezier(.22, 1, .36, 1);
}

.pk-splash__loaderDock.is-ready .pk-progress__track {
  height: 54px;
  border-radius: 18px;
  background: rgba(225,6,0,.34);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.18),
    0 0 34px rgba(255,0,0,.36);
}

.pk-progress__bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  transform-origin: left;
  transform: scaleX(0) translateZ(0);
  border-radius: inherit;
  background: linear-gradient(90deg, #7a0000, #ff1616 44%, #ffffff 50%, #ff1616 58%, #7a0000);
  box-shadow: 0 0 14px rgba(255,0,0,.85);
  animation-name: pkProgressFill;
  animation-timing-function: cubic-bezier(.2,.88,.2,1);
  animation-fill-mode: forwards;
  will-change: transform;
}

.pk-progress__copy {
  display: grid;
  justify-items: center;
  gap: 7px;
  width: min(100%, 292px);
}

.pk-progress__label {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .18em;
  color: rgba(255,255,255,.56);
}

.pk-progress__logs {
  min-height: 46px;
  display: grid;
  gap: 4px;
  justify-items: center;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .55rem;
  line-height: 1.15;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.pk-progress__log {
  color: rgba(244,244,244,.24);
  transform: translate3d(0, 2px, 0);
  opacity: .48;
  transition:
    color 220ms ease,
    opacity 220ms ease,
    transform 220ms ease;
}

.pk-progress__log.is-active {
  color: rgba(244,244,244,.62);
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.pk-borderButton {
  position: relative;
  width: 100%;
  min-height: 54px;
  border: 0;
  padding: 0;
  border-radius: 18px;
  color: #fff;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transform: translate3d(0, 12px, 0) scale(.96);
  pointer-events: none;
  transition: opacity 420ms ease, transform 420ms cubic-bezier(.2,.9,.2,1);
  contain: layout paint style;
  isolation: isolate;
  will-change: opacity, transform;
}

.pk-splash__loaderDock.is-ready .pk-borderButton {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  pointer-events: auto;
  transition:
    opacity 360ms ease 210ms,
    transform 560ms cubic-bezier(.22, 1, .36, 1) 150ms;
}

.pk-borderButton__halo,
.pk-borderButton__glow {
  position: absolute;
  inset: -3px;
  border-radius: 21px;
  overflow: hidden;
  pointer-events: none;
  transform: translateZ(0);
}

.pk-borderButton__halo {
  inset: -18px;
  border-radius: 34px;
  opacity: .88;
  filter: blur(15px);
}

.pk-borderButton__halo::before,
.pk-borderButton__glow::before {
  content: "";
  position: absolute;
  inset: -115%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 22, 22, .1) 35deg,
    rgba(255, 22, 22, .95) 62deg,
    #ffffff 76deg,
    rgba(255, 22, 22, 1) 88deg,
    rgba(255, 22, 22, .16) 118deg,
    transparent 150deg,
    transparent 215deg,
    rgba(255, 22, 22, .68) 250deg,
    #ffffff 264deg,
    rgba(255, 22, 22, .9) 278deg,
    transparent 312deg,
    transparent 360deg
  );
  animation: pkSpinFast 1.38s linear infinite;
  will-change: transform;
}

.pk-borderButton__glow {
  padding: 2px;
  filter: drop-shadow(0 0 9px rgba(255,0,0,.95)) drop-shadow(0 0 22px rgba(255,0,0,.55));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.pk-borderButton__halo::before {
  animation-duration: 1.95s;
  opacity: .68;
}

.pk-borderButton__inner {
  position: relative;
  z-index: 1;
  min-height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  padding: 0 24px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.025)),
    linear-gradient(135deg, rgba(255,22,22,.96), rgba(128,0,0,.9));
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.3),
    inset 0 -18px 38px rgba(0,0,0,.32),
    0 18px 40px rgba(0,0,0,.42),
    0 0 42px rgba(255,0,0,.28);
  font-weight: 900;
  font-size: .9rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  text-shadow: 0 1px 0 rgba(0,0,0,.34);
  transform: translateZ(0);
}

.pk-borderButton__inner::before {
  content: "";
  position: absolute;
  inset: -35% -65%;
  background: linear-gradient(110deg, transparent 0 37%, rgba(255,255,255,.42) 48%, transparent 59% 100%);
  transform: translate3d(-42%, 0, 0);
  animation: pkButtonShine 2.4s ease-in-out infinite;
  pointer-events: none;
  will-change: transform;
}

.pk-borderButton__label {
  position: relative;
  z-index: 1;
}

.pk-borderButton:hover .pk-borderButton__inner {
  transform: translate3d(0, -1px, 0);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.38),
    inset 0 -18px 38px rgba(0,0,0,.3),
    0 22px 46px rgba(0,0,0,.48),
    0 0 58px rgba(255,0,0,.44);
}

.pk-borderButton:active .pk-borderButton__inner {
  transform: translate3d(0, 1px, 0) scale(.99);
}

.pk-appIcon {
  --pk-icon-size: 72px;
  --pk-radius: 18px;

  position: relative;
  width: var(--pk-icon-size);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: var(--pk-radius);
  transform-style: preserve-3d;
  animation: pkIconFloat 5s ease-in-out infinite;
  contain: layout paint style;
  isolation: isolate;
  transform: translateZ(0);
  will-change: transform;
}

.pk-appIcon__plate {
  position: relative;
  z-index: 5;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--pk-radius);
  background:
    linear-gradient(145deg, rgba(255,255,255,.12), transparent 28%),
    radial-gradient(circle at 50% 112%, rgba(255,0,0,.26), transparent 36%),
    linear-gradient(145deg, #17191e 0%, #050609 58%, #101216 100%);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.28),
    inset 0 -14px 26px rgba(255,0,0,.11),
    0 16px 34px rgba(0,0,0,.62),
    0 0 28px rgba(255,0,0,.18);
  transform: translateZ(0);
}

.pk-appIcon__plate::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(145deg, rgba(255,255,255,.72), rgba(255,255,255,.07) 34%, rgba(255,0,0,.86) 78%, rgba(255,255,255,.18));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.pk-appIcon__image {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
}

.pk-appIcon__shine {
  position: absolute;
  inset: 0;
  z-index: 3;
  background:
    linear-gradient(145deg, rgba(255,255,255,.3), transparent 34%),
    radial-gradient(circle at 22% 0%, rgba(255,255,255,.26), transparent 28%);
  mix-blend-mode: screen;
  opacity: .44;
  pointer-events: none;
}

.pk-appIcon__fallback {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .02em;
  color: #f8f8f8;
  font-size: calc(var(--pk-icon-size) * .4);
  line-height: 1;
  font-weight: 1000;
  font-style: italic;
  letter-spacing: -.14em;
  text-shadow:
    0 1px 0 rgba(255,255,255,.45),
    0 8px 22px rgba(0,0,0,.62),
    0 0 22px rgba(255,255,255,.22);
}

.pk-appIcon__fallback span:last-child {
  color: #e90808;
  text-shadow: 0 0 24px rgba(255,0,0,.66), 0 10px 24px rgba(0,0,0,.65);
}

.pk-appIcon__aura {
  position: absolute;
  inset: -22px;
  z-index: 0;
  border-radius: calc(var(--pk-radius) + 22px);
  background: radial-gradient(circle at 50% 52%, rgba(255,0,0,.5), transparent 62%);
  filter: blur(14px);
  animation: pkAuraBreath 2.4s ease-in-out infinite alternate;
  transform: translateZ(0);
  will-change: transform, opacity;
}

.pk-appIcon__glowRing,
.pk-appIcon__edge {
  position: absolute;
  pointer-events: none;
  transform: translateZ(0);
}

.pk-appIcon__glowRing {
  inset: -5px;
  z-index: 3;
  border-radius: calc(var(--pk-radius) + 5px);
  padding: 3px;
  overflow: hidden;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.pk-appIcon__glowRing::before {
  content: "";
  position: absolute;
  inset: -95%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255,0,0,.18) 38deg,
    rgba(255,0,0,1) 62deg,
    #ffffff 77deg,
    rgba(255,0,0,1) 92deg,
    rgba(255,0,0,.18) 120deg,
    transparent 155deg,
    transparent 220deg,
    rgba(255,0,0,.8) 255deg,
    #ffffff 268deg,
    rgba(255,0,0,.9) 282deg,
    transparent 320deg,
    transparent 360deg
  );
  animation: pkSpinFast 1.55s linear infinite;
  will-change: transform;
}

.pk-appIcon__glowRing--wide {
  inset: -10px;
  padding: 9px;
  z-index: 1;
  filter: blur(8px);
  opacity: .86;
}

.pk-appIcon__glowRing--wide::before {
  animation-duration: 2.15s;
  opacity: .86;
}

.pk-appIcon__glowRing--sharp {
  filter: drop-shadow(0 0 10px rgba(255,0,0,.98)) drop-shadow(0 0 22px rgba(255,0,0,.56));
}

.pk-appIcon__edge {
  inset: -1px;
  z-index: 4;
  border-radius: calc(var(--pk-radius) + 1px);
  padding: 1px;
  background: linear-gradient(145deg, rgba(255,255,255,.66), rgba(255,255,255,.07), rgba(255,0,0,.95));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: .92;
}

@keyframes pkSpinFast {
  to { transform: rotate(360deg); }
}

@keyframes pkButtonShine {
  0%, 28% { transform: translate3d(-42%, 0, 0); }
  58%, 100% { transform: translate3d(42%, 0, 0); }
}

@keyframes pkProgressFill {
  from { transform: scaleX(0) translateZ(0); }
  to { transform: scaleX(1) translateZ(0); }
}

@keyframes pkIconFloat {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -7px, 0) scale(1.014); }
}

@keyframes pkAuraBreath {
  from { opacity: .42; transform: scale(.96) translateZ(0); }
  to { opacity: .9; transform: scale(1.08) translateZ(0); }
}

@keyframes pkPulse {
  from { opacity: .12; transform: scale(.96) translateZ(0); }
  to { opacity: .26; transform: scale(1.08) translateZ(0); }
}

@keyframes pkSpeed {
  from { transform: translate3d(-7%, 0, 0) rotate(0.001deg); }
  to { transform: translate3d(7%, 0, 0) rotate(0.001deg); }
}

@keyframes pkExitSweep {
  from { transform: translate3d(-110%, 0, 0); }
  to { transform: translate3d(110%, 0, 0); }
}

@media (max-width: 480px) {
  .pk-splash {
    padding: 36px 20px;
  }

  .pk-splash__content {
    gap: 26px;
  }

  .pk-splash__baseline {
    letter-spacing: .24em;
  }

  .pk-splash__loaderDock,
  .pk-splash__loaderDock.has-logo {
    width: min(300px, 82vw);
  }
}

@media (max-height: 680px) {
  .pk-splash__content {
    gap: 18px;
  }

  .pk-splash__content .pk-appIcon {
    --pk-icon-size: 68px !important;
    --pk-radius: 17px !important;
  }

  .pk-splash__wordmarkFallback {
    font-size: clamp(2rem, 9vw, 3.45rem);
  }

  .pk-splash__wordmarkImage {
    width: min(300px, 76vw);
    max-height: 58px;
  }

  .pk-splash__baseline {
    font-size: .68rem;
  }

  .pk-splash__loaderDock.has-logo {
    top: calc(50% + 220px);
  }
}

@media (max-height: 560px) {
  .pk-splash__content .pk-appIcon {
    --pk-icon-size: 56px !important;
    --pk-radius: 14px !important;
  }

  .pk-splash__baseline {
    display: none;
  }

  .pk-splash__loaderDock.has-logo {
    top: calc(50% + 162px);
  }

  .pk-progress__logs {
    min-height: 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pk-splash *,
  .pk-appIcon *,
  .pk-appIcon,
  .pk-borderButton *,
  .pk-borderButton {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
    scroll-behavior: auto !important;
  }

  .pk-splash__content {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
`;
