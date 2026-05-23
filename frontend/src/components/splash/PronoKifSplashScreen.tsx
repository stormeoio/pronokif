import React, { useEffect, useMemo, useState } from "react";

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
 * 0s  -> intro video starts
 * 7s  -> app icon + wordmark + baseline appear
 * 11s -> progress bar is replaced by the "Commencer" button
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
  videoSrc?: string;
  posterSrc?: string;
  appName?: string;
  baseline?: string;
  loadingLabel?: string;
  introDelayMs?: number;
  buttonDelayMs?: number;
  onStart?: () => void;
  className?: string;
};

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
  alt = "Icône application PronoKif F1",
  size = 174,
  radius = 42,
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
  iconSrc,
  videoSrc = "/video/_Topaz_86430.mp4",
  posterSrc,
  appName = "PronoKif F1",
  baseline = "Pronostiquez. Défiez. Vivez.",
  loadingLabel = "Chargement de la grille…",
  introDelayMs = 7000,
  buttonDelayMs = 11000,
  onStart,
  className = "",
}: PronoKifSplashScreenProps) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const logoTimer = window.setTimeout(() => setLogoVisible(true), introDelayMs);
    const readyTimer = window.setTimeout(() => setReady(true), buttonDelayMs);

    return () => {
      window.clearTimeout(logoTimer);
      window.clearTimeout(readyTimer);
    };
  }, [introDelayMs, buttonDelayMs]);

  const progressDuration = useMemo(
    () => Math.max(buttonDelayMs - introDelayMs, 1200),
    [buttonDelayMs, introDelayMs],
  );

  return (
    <main className={`pk-splash ${className}`}>
      <style>{styles}</style>

      <div className="pk-splash__videoLayer" aria-hidden="true">
        <video
          className="pk-splash__video"
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          data-testid="splash-video"
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
        aria-label="Écran de lancement PronoKif F1"
      >
        <AppIconGlow iconSrc={iconSrc} size={178} radius={43} />

        <div className="pk-splash__brandBlock">
          <h1 className="pk-splash__wordmark" aria-label={appName}>
            <span className="pk-splash__wordmarkWhite">Prono</span>
            <span className="pk-splash__wordmarkRed">Kif</span>
            <span className="pk-splash__wordmarkF1">F1</span>
          </h1>
          <p className="pk-splash__baseline">{baseline}</p>
        </div>

        <div className={`pk-splash__actionZone ${ready ? "is-ready" : ""}`}>
          <div className="pk-progress" role="status" aria-live="polite">
            <div className="pk-progress__track">
              <div
                className="pk-progress__bar"
                style={{ animationDuration: `${progressDuration}ms` }}
              />
            </div>
            <span>{loadingLabel}</span>
          </div>

          <BorderGlowButton onClick={onStart} className="pk-splash__startButton">
            Commencer
          </BorderGlowButton>
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
  padding: 30px;
  background: #020307;
  font-family: Chivo, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  isolation: isolate;
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

.pk-splash__content {
  width: min(460px, 100%);
  display: grid;
  justify-items: center;
  gap: 22px;
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
  gap: 10px;
  text-align: center;
}

.pk-splash__wordmark {
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: .035em;
  font-size: clamp(2.35rem, 10vw, 4.35rem);
  font-family: "Racing Sans One", Chivo, ui-sans-serif, system-ui, sans-serif;
  line-height: .9;
  letter-spacing: .01em;
  font-weight: 400;
  text-transform: uppercase;
  transform: skewX(-8deg) translateZ(0);
  filter: drop-shadow(0 18px 28px rgba(0,0,0,.72));
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
  letter-spacing: -.04em;
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

.pk-splash__actionZone {
  position: relative;
  width: min(288px, 76vw);
  height: 64px;
  display: grid;
  place-items: center;
  margin-top: 4px;
}

.pk-progress,
.pk-splash__startButton {
  grid-area: 1 / 1;
}

.pk-progress {
  width: 100%;
  display: grid;
  gap: 11px;
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

.pk-splash__actionZone.is-ready .pk-progress {
  opacity: 0;
  transform: translate3d(0, -8px, 0) scale(.96);
  pointer-events: none;
}

.pk-progress__track {
  position: relative;
  width: 100%;
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255,255,255,.12);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 0 24px rgba(255,0,0,.14);
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

.pk-splash__actionZone.is-ready .pk-borderButton {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  pointer-events: auto;
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
  --pk-icon-size: 174px;
  --pk-radius: 42px;

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
    inset 0 -28px 58px rgba(255,0,0,.11),
    0 26px 60px rgba(0,0,0,.68),
    0 0 44px rgba(255,0,0,.2);
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
  inset: -34px;
  z-index: 0;
  border-radius: calc(var(--pk-radius) + 34px);
  background: radial-gradient(circle at 50% 52%, rgba(255,0,0,.5), transparent 62%);
  filter: blur(20px);
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
  inset: -14px;
  padding: 13px;
  z-index: 1;
  filter: blur(10px);
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

@media (max-width: 480px) {
  .pk-splash {
    padding: 24px;
  }

  .pk-splash__content {
    gap: 20px;
  }

  .pk-splash__baseline {
    letter-spacing: .24em;
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
