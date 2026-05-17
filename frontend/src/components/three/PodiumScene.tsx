/**
 * PodiumScene — 3D animated podium for the race results page.
 *
 * Three metallic blocks (P1/P2/P3) with ascending heights,
 * glowing emissive accents and subtle floating animation.
 * The center podium is tallest. Ambient particles rise upward.
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Object3D } from "three";
import type { Mesh, InstancedMesh, Group } from "three";

// ─── Podium Block ─────────────────────────────────────────────────────────────

function PodiumBlock({
  position,
  height,
  color,
  emissive,
  label,
}: {
  position: [number, number, number];
  height: number;
  color: string;
  emissive: string;
  label: string;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle breathing scale
    meshRef.current.scale.y = 1 + Math.sin(t * 1.2 + position[0]) * 0.02;
  });

  return (
    <group position={position}>
      {/* Main block */}
      <mesh ref={meshRef} position={[0, height / 2, 0]}>
        <boxGeometry args={[0.7, height, 0.7]} />
        <meshStandardMaterial
          color={color}
          metalness={0.9}
          roughness={0.2}
          emissive={emissive}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Top face glow */}
      <mesh position={[0, height + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.65, 0.65]} />
        <meshStandardMaterial
          color={emissive}
          emissive={emissive}
          emissiveIntensity={2}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Number indicator floating above */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh position={[0, height + 0.5, 0]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={emissive}
            emissiveIntensity={3}
            metalness={0.5}
            roughness={0.1}
          />
        </mesh>
      </Float>
    </group>
  );
}

// ─── Rising Particles ─────────────────────────────────────────────────────────

function RisingParticles({ count = 40 }: { count?: number }) {
  const meshRef = useRef<InstancedMesh>(null);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 4,
      y: Math.random() * 3 - 1,
      z: (Math.random() - 0.5) * 2,
      speed: 0.2 + Math.random() * 0.4,
      size: 0.01 + Math.random() * 0.02,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const dummy = new Object3D();
    const t = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      const y = ((p.y + t * p.speed) % 3) - 1;
      dummy.position.set(
        p.x + Math.sin(t * 0.5 + i) * 0.1,
        y,
        p.z,
      );
      dummy.scale.setScalar(p.size * (1 + Math.sin(t * 2 + i) * 0.3));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color="#ff6600"
        emissive="#ff6600"
        emissiveIntensity={2}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

function Scene() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.08;
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight
        position={[0, 5, 3]}
        angle={0.6}
        penumbra={1}
        intensity={2}
        color="#ff6600"
        castShadow
      />
      <pointLight position={[-3, 2, -1]} color="#00ccff" intensity={0.6} />
      <pointLight position={[3, 2, -1]} color="#ff3366" intensity={0.4} />

      <group ref={groupRef}>
        {/* P2 — Left */}
        <PodiumBlock
          position={[-0.9, -0.5, 0]}
          height={1.0}
          color="#c0c0c0"
          emissive="#6699ff"
          label="2"
        />

        {/* P1 — Center (tallest) */}
        <PodiumBlock
          position={[0, -0.5, 0]}
          height={1.5}
          color="#ffd700"
          emissive="#ff8c00"
          label="1"
        />

        {/* P3 — Right */}
        <PodiumBlock
          position={[0.9, -0.5, 0]}
          height={0.7}
          color="#cd7f32"
          emissive="#ff5533"
          label="3"
        />
      </group>

      <RisingParticles />
    </>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────

export default function PodiumScene({ className = "" }: { className?: string }) {
  return (
    <div className={className} style={{ height: 180, width: "100%" }}>
      <Canvas
        camera={{ position: [0, 1.2, 3.5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
