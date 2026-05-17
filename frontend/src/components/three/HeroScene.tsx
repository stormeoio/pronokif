/**
 * HeroScene — 3D floating F1 helmet/trophy scene for dashboard hero.
 *
 * Uses React Three Fiber with animated particles, floating geometry,
 * and dynamic lighting for a premium gaming feel.
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Stars } from "@react-three/drei";
import { AdditiveBlending } from "three";
import type { Mesh, Points } from "three";

// ─── Animated racing-themed torus ring ───────────────────────────────────────

function RacingRing() {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    ref.current.rotation.z = state.clock.elapsedTime * 0.15;
  });

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <torusGeometry args={[2.2, 0.06, 16, 64]} />
      <meshStandardMaterial
        color="#00ccff"
        emissive="#00ccff"
        emissiveIntensity={0.8}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
}

// ─── Glowing orb (trophy/championship) ──────────────────────────────────────

function ChampionshipOrb() {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
  });

  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={0.4}>
      <mesh ref={ref} position={[0, 0, 0]}>
        <icosahedronGeometry args={[0.9, 4]} />
        <MeshDistortMaterial
          color="#fbbf24"
          emissive="#ff6600"
          emissiveIntensity={0.4}
          metalness={1}
          roughness={0.15}
          distort={0.25}
          speed={3}
        />
      </mesh>
    </Float>
  );
}

// ─── Orbiting speed particles ────────────────────────────────────────────────

function SpeedParticles({ count = 120 }: { count?: number }) {
  const ref = useRef<Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 1.5;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, [count]);

  const sizes = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = Math.random() * 0.04 + 0.01;
    }
    return s;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.08;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#00ccff"
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Accent rings (multiple orbits) ─────────────────────────────────────────

function AccentRings() {
  const ref1 = useRef<Mesh>(null);
  const ref2 = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref1.current) {
      ref1.current.rotation.x = t * 0.2;
      ref1.current.rotation.y = t * 0.1;
    }
    if (ref2.current) {
      ref2.current.rotation.x = t * -0.15;
      ref2.current.rotation.z = t * 0.12;
    }
  });

  return (
    <>
      <mesh ref={ref1} position={[0, 0, 0]}>
        <torusGeometry args={[1.6, 0.02, 8, 48]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.5} />
      </mesh>
      <mesh ref={ref2} position={[0, 0, 0]}>
        <torusGeometry args={[1.9, 0.015, 8, 48]} />
        <meshBasicMaterial color="#e63946" transparent opacity={0.3} />
      </mesh>
    </>
  );
}

// ─── Main exported component ─────────────────────────────────────────────────

export default function HeroScene({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full h-full ${className}`} style={{ minHeight: 200 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} color="#00ccff" intensity={1.5} />
        <pointLight position={[-5, -3, 3]} color="#ff6600" intensity={1} />
        <pointLight position={[0, 3, -5]} color="#fbbf24" intensity={0.8} />

        {/* Background stars */}
        <Stars radius={80} depth={60} count={1500} factor={3} fade speed={0.5} />

        {/* Scene elements */}
        <ChampionshipOrb />
        <RacingRing />
        <AccentRings />
        <SpeedParticles />
      </Canvas>
    </div>
  );
}
