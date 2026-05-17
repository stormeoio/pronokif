/**
 * RaceCountdownOrb — Pulsing 3D energy orb that intensifies as race approaches.
 *
 * The orb distortion, glow, and particle speed scale with urgency (0→1).
 */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";

interface OrbProps {
  urgency: number; // 0 (far) to 1 (imminent)
}

function EnergyOrb({ urgency }: OrbProps) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * (2 + urgency * 4)) * 0.05 * (1 + urgency);
    ref.current.scale.setScalar(pulse);
    ref.current.rotation.y = t * 0.3;
  });

  // Color transitions from cyan (calm) to orange/red (urgent)
  const color = urgency > 0.7 ? "#ff3300" : urgency > 0.4 ? "#ff6600" : "#00ccff";
  const emissiveColor = urgency > 0.7 ? "#ff0000" : urgency > 0.4 ? "#ff8800" : "#0088ff";

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.8, 64, 64]} />
      <MeshDistortMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={0.5 + urgency * 1.5}
        metalness={0.3}
        roughness={0.2}
        distort={0.15 + urgency * 0.3}
        speed={3 + urgency * 5}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function OrbRings({ urgency }: OrbProps) {
  const ref1 = useRef<Mesh>(null);
  const ref2 = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = 0.5 + urgency * 1.5;
    if (ref1.current) {
      ref1.current.rotation.x = t * speed;
      ref1.current.rotation.z = t * speed * 0.5;
    }
    if (ref2.current) {
      ref2.current.rotation.y = t * speed * 0.8;
      ref2.current.rotation.x = t * speed * 0.3;
    }
  });

  const ringColor = urgency > 0.5 ? "#ff6600" : "#00ccff";

  return (
    <>
      <mesh ref={ref1}>
        <torusGeometry args={[1.2, 0.02, 8, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.4 + urgency * 0.3} />
      </mesh>
      <mesh ref={ref2}>
        <torusGeometry args={[1.0, 0.015, 8, 48]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.3} />
      </mesh>
    </>
  );
}

export default function RaceCountdownOrb({
  urgency = 0,
  className = "",
}: OrbProps & { className?: string }) {
  return (
    <div className={`${className}`} style={{ height: 120, width: 120 }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[3, 3, 3]} color="#ffffff" intensity={1} />

        <EnergyOrb urgency={urgency} />
        <OrbRings urgency={urgency} />
      </Canvas>
    </div>
  );
}
