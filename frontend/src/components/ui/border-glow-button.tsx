import * as React from "react";
import { cn } from "@/lib/utils";

type GlowColorSet = [string, string, string];

export interface BorderGlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  edgeSensitivity?: number;
  glowColor?: string;
  glowIntensity?: number;
  glowRadius?: number;
  coneSpread?: number;
  colors?: GlowColorSet;
}

const DEFAULT_COLORS: GlowColorSet = ["#E10600", "#ff6b63", "#F4F4F4"];

const getEdgeProximity = (width: number, height: number, x: number, y: number) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const dx = x - centerX;
  const dy = y - centerY;
  const kx = dx === 0 ? Number.POSITIVE_INFINITY : centerX / Math.abs(dx);
  const ky = dy === 0 ? Number.POSITIVE_INFINITY : centerY / Math.abs(dy);

  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
};

const getCursorAngle = (width: number, height: number, x: number, y: number) => {
  const dx = x - width / 2;
  const dy = y - height / 2;

  if (dx === 0 && dy === 0) {
    return 0;
  }

  const degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  return degrees < 0 ? degrees + 360 : degrees;
};

const BorderGlowButton = React.forwardRef<HTMLButtonElement, BorderGlowButtonProps>(
  (
    {
      children,
      className,
      edgeSensitivity = 26,
      glowColor = "1 100% 88%",
      glowIntensity = 1,
      glowRadius = 22,
      coneSpread = 25,
      colors = DEFAULT_COLORS,
      onPointerLeave,
      onPointerMove,
      style,
      ...props
    },
    ref,
  ) => {
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    const handlePointerMove = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        const button = buttonRef.current;

        if (button) {
          const rect = button.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const edge = getEdgeProximity(rect.width, rect.height, x, y);
          const angle = getCursorAngle(rect.width, rect.height, x, y);

          button.style.setProperty("--pk-edge-proximity", `${(edge * 100).toFixed(3)}`);
          button.style.setProperty("--pk-cursor-angle", `${angle.toFixed(3)}deg`);
        }

        onPointerMove?.(event);
      },
      [onPointerMove],
    );

    const handlePointerLeave = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        buttonRef.current?.style.setProperty("--pk-edge-proximity", "0");
        onPointerLeave?.(event);
      },
      [onPointerLeave],
    );

    const glowStyle = {
      "--pk-edge-sensitivity": edgeSensitivity,
      "--pk-glow-padding": `${glowRadius}px`,
      "--pk-glow-intensity": glowIntensity,
      "--pk-cone-spread": coneSpread,
      "--pk-glow-hsl": glowColor,
      "--pk-glow-color-one": colors[0],
      "--pk-glow-color-two": colors[1],
      "--pk-glow-color-three": colors[2],
      ...style,
    } as React.CSSProperties;

    return (
      <button
        ref={buttonRef}
        className={cn("btn-pk btn-pk-glow", className)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={glowStyle}
        {...props}
      >
        <span className="btn-pk-glow-edge" aria-hidden="true" />
        <span className="btn-pk-content">{children}</span>
      </button>
    );
  },
);

BorderGlowButton.displayName = "BorderGlowButton";

export { BorderGlowButton };
