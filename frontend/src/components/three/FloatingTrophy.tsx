/**
 * FloatingTrophy — 3D trophy/podium scene for leaderboard headers.
 *
 * Compact canvas with a rotating metallic trophy shape
 * that responds to pointer hover.
 */
import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshReflectorMaterial } from "@react-three/drei";
import { MathUtils } from "three";
import type { Group } from "three";

function Trophy() {
  const groupRef = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle tilt toward pointer
    groupRef.current.rotation.y = MathUtils.lerp(
      groupRef.current.rotation.y,
      pointer.x * 0.3 + t * 0.2,
      0.05,
    );
    groupRef.current.rotation.x = MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.y * -0.1,
      0.05,
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={groupRef}>
        {/* Cup body */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.5, 0.35, 0.8, 32, 1, true]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={1}
            roughness={0.2}
            emissive="#ff8c00"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Cup rim */}
        <mesh position={[0, 0.7, 0]}>
          <torusGeometry args={[0.5, 0.04, 12, 32]} />
          <meshStandardMaterial color="#fcd34d" metalness={1} roughness={0.1} />
        </mesh>

        {/* Base */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.4, 0.4, 32]} />
          <meshStandardMaterial color="#d4a000" metalness={0.9} roughness={0.3} />
        </mesh>

        {/* Pedestal */}
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.7, 0.15, 0.7]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.4} />
        </mesh>

        {/* Star on cup */}
        <mesh position={[0, 0.35, 0.36]}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#fbbf24"
            emissiveIntensity={2}
            metalness={0.5}
            roughness={0.1}
          />
        </mesh>
      </group>
    </Float>
  );
}

function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
      <planeGeometry args={[6, 6]} />
      <MeshReflectorMaterial
        mirror={0.4}
        blur={[300, 100]}
        resolution={512}
        mixBlur={1}
        color="#0a1628"
        metalness={0.8}
        roughness={0.6}
      />
    </mesh>
  );
}

export default function FloatingTrophy({ className = "" }: { className?: string }) {
  return (
    <div className={`${className}`} style={{ height: 160, width: "100%" }}>
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.4} />
        <spotLight position={[3, 5, 3]} angle={0.5} penumbra={1} intensity={2} color="#fbbf24" />
        <pointLight position={[-3, 2, -2]} color="#00ccff" intensity={0.8} />

        <Trophy />
        <ReflectiveFloor />
      </Canvas>
    </div>
  );
}
