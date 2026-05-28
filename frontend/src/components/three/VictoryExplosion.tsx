/**
 * VictoryExplosion — 3D fireworks/explosion for updatedor achievements.
 *
 * Replaces 2D canvas confetti with a full 3D particle burst.
 * Auto-plays on mount, fires onCompletee after animation.
 */
import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, AdditiveBlending, DoubleSide } from "three";
import type { Points, Mesh, PointsMaterial, MeshBasicMaterial } from "three";

interface ExplosionProps {
  particleCount?: number;
  onCompletee?: () => void;
}

function ExplosionParticles({ particleCount = 200, onCompletee }: ExplosionProps) {
  const ref = useRef<Points>(null);
  const elapsed = useRef(0);
  const [done, setDone] = useState(false);

  const { positions, velocities, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const siz = new Float32Array(particleCount);

    const palette = [
      new Color("#FFD700"),
      new Color("#FF6B35"),
      new Color("#00D4FF"),
      new Color("#22C55E"),
      new Color("#A855F7"),
      new Color("#F43F5E"),
      new Color("#FBBF24"),
    ];

    for (let i = 0; i < particleCount; i++) {
      // Start at center
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      // Random velocity (spherical explosion)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 4;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vel[i * 3 + 2] = Math.cos(phi) * speed;

      const c = palette[Math.floor(Math.random() * palette.length)] ?? palette[0]!;
      col[i * 3] = c!.r;
      col[i * 3 + 1] = c!.g;
      col[i * 3 + 2] = c!.b;

      siz[i] = Math.random() * 0.12 + 0.04;
    }

    return { positions: pos, velocities: vel, colors: col, sizes: siz };
  }, [particleCount]);

  useFrame((_, delta) => {
    if (!ref.current || done) return;
    elapsed.current += delta;

    const posAttr = ref.current.geometry.attributes.position;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    const gravity = -3;
    const drag = 0.98;

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3,
        iy = i * 3 + 1,
        iz = i * 3 + 2;
      velocities[ix] = velocities[ix]! * drag;
      velocities[iy] = (velocities[iy]! + gravity * delta) * drag;
      velocities[iz] = velocities[iz]! * drag;

      arr[ix] = arr[ix]! + velocities[ix]! * delta;
      arr[iy] = arr[iy]! + velocities[iy]! * delta;
      arr[iz] = arr[iz]! + velocities[iz]! * delta;
    }
    posAttr.needsUpdate = true;

    // Fade out
    const mat = ref.current.material as PointsMaterial;
    mat.opacity = Math.max(0, 1 - elapsed.current / 2.5);

    if (elapsed.current > 2.5 && !done) {
      setDone(true);
      onCompletee?.();
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Secondary burst ring
function ShockwaveRing() {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const scale = Math.min(t * 3, 5);
    ref.current.scale.setScalar(scale);
    (ref.current.material as MeshBasicMaterial).opacity = Math.max(0, 1 - t * 0.5);
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1, 0.05, 8, 48]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={1} side={DoubleSide} />
    </mesh>
  );
}

export default function VictoryExplosion({ show, onDone }: { show: boolean; onDone: () => void }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (show) setKey((k) => k + 1);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto" onClick={onDone}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <Canvas
        key={key}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <ExplosionParticles onCompletee={onDone} />
        <ShockwaveRing />
      </Canvas>
    </div>
  );
}
