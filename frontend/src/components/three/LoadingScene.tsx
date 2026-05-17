/**
 * LoadingScene — 3D animated loader replacing the basic spinner.
 *
 * Features a spinning F1-inspired wheel with particles.
 */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import type { Group, Points } from "three";

function SpinningWheel() {
  const groupRef = useRef<Group>(null);
  const particlesRef = useRef<Points>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.z = t * 3;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.z = -t * 1.5;
      particlesRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
    }
  });

  // Create particle trail positions
  const trailPositions = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const radius = 1.2 + Math.random() * 0.3;
    trailPositions[i * 3] = Math.cos(angle) * radius;
    trailPositions[i * 3 + 1] = Math.sin(angle) * radius;
    trailPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }

  return (
    <>
      <group ref={groupRef}>
        {/* Outer ring */}
        <mesh>
          <torusGeometry args={[1, 0.04, 12, 48]} />
          <meshStandardMaterial
            color="#ff6600"
            emissive="#ff6600"
            emissiveIntensity={1}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Spokes */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI * 2]}>
            <boxGeometry args={[1.8, 0.02, 0.02]} />
            <meshStandardMaterial
              color="#00ccff"
              emissive="#00ccff"
              emissiveIntensity={0.5}
              transparent
              opacity={0.6}
            />
          </mesh>
        ))}

        {/* Center hub */}
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={1.5}
            metalness={1}
            roughness={0}
          />
        </mesh>
      </group>

      {/* Orbiting particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#00ccff"
          transparent
          opacity={0.7}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

export default function LoadingScene({ message = "Chargement..." }: { message?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #050a14 100%)" }}
    >
      <div style={{ width: 160, height: 160 }}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.3} />
          <pointLight position={[2, 2, 2]} color="#ff6600" intensity={1.5} />
          <pointLight position={[-2, -1, 2]} color="#00ccff" intensity={1} />
          <SpinningWheel />
        </Canvas>
      </div>

      <div className="text-center space-y-2">
        <p className="font-heading text-sm text-white/80 uppercase tracking-widest animate-pulse">
          {message}
        </p>
        <div className="w-32 h-0.5 mx-auto bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 via-cyan-400 to-orange-500 animate-shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}
