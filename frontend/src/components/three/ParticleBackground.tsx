/**
 * ParticleBackground — Full-viewport animated 3D particle field.
 *
 * Creates depth and motion behind page content.
 * Extremely lightweight: renders only points + one frame color pass.
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, AdditiveBlending } from "three";
import type { Points, GridHelper } from "three";

function Particles({ count = 300 }: { count?: number }) {
  const ref = useRef<Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new Color("#00ccff"),
      new Color("#ff6600"),
      new Color("#fbbf24"),
      new Color("#22d3ee"),
      new Color("#3b82f6"),
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;

      const c = palette[Math.floor(Math.random() * palette.length)] ?? palette[0]!;
      col[i * 3] = c!.r;
      col[i * 3 + 1] = c!.g;
      col[i * 3 + 2] = c!.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.02;
    ref.current.rotation.x = Math.sin(t * 0.01) * 0.05;

    // Drift particles upward slowly
    const posAttr = ref.current.geometry.attributes.position;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1]! += 0.003;
      if (arr[i * 3 + 1]! > 10) arr[i * 3 + 1] = -10;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function GridFloor() {
  const ref = useRef<GridHelper>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.z = (state.clock.elapsedTime * 0.5) % 2;
  });

  return (
    <gridHelper
      ref={ref}
      args={[40, 40, "#0a3d6e", "#0a2040"]}
      position={[0, -5, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1]}
      >
        <Particles count={250} />
        <GridFloor />
      </Canvas>
    </div>
  );
}
