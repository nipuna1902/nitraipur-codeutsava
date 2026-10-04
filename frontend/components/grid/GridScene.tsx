"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { COLORS, EDGES, NODES, type GridNode, type Telemetry } from "@/lib/grid";

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <div className="flex h-full items-center justify-center p-12 text-center text-sm text-slate-500">
        3D rendering is unavailable. Enable WebGL or use the node list below to inspect telemetry and simulate faults.
      </div>
    ) : (
      this.props.children
    );
  }
}

function StatusDot({ color }: { color: string }) {
  return <span className="inline-block size-2 rounded-full align-middle" style={{ backgroundColor: color }} />;
}

function Node({
  node,
  telemetry,
  selected,
  onSelect,
  reducedMotion
}: {
  node: GridNode;
  telemetry: Telemetry;
  selected: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = COLORS[telemetry.health];

  useFrame(({ clock }) => {
    const pulse = telemetry.health === "critical" && !reducedMotion ? (Math.sin(clock.elapsedTime * 4) + 1) / 2 : 0;
    if (ring.current) ring.current.scale.setScalar(1 + pulse * 0.25);
    if (material.current) material.current.emissiveIntensity = 0.15 + pulse * 1.4;
  });

  return (
    <group position={node.position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[1.8, 0.24, 1.5]} />
        <meshStandardMaterial color={selected ? "#0f766e" : "#cbd5e1"} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[1.08, 1.13, 48]} />
        <meshBasicMaterial color={selected ? "#0f766e" : color} transparent opacity={selected ? 1 : 0.72} side={THREE.DoubleSide} />
      </mesh>

      {node.kind === "Substation" ? (
        <>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[1.25, 1.15, 0.95]} />
            <meshStandardMaterial color="#64748b" metalness={0.45} roughness={0.38} />
          </mesh>
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} position={[x, 1.65, 0]}>
              <cylinderGeometry args={[0.12, 0.18, 0.65, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.45} roughness={0.35} />
            </mesh>
          ))}
        </>
      ) : node.kind === "Feeder" ? (
        <>
          <mesh position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.12, 0.2, 1.9, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.45} roughness={0.35} />
          </mesh>
          {[1.5, 1.95].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[1.5, 0.12, 0.14]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          ))}
        </>
      ) : (
        [-0.42, 0.42].map((x, index) => (
          <group key={x} position={[x, 0, index * 0.2]}>
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[0.6, 0.8, 0.7]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.53, 0.4, 4]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
            <mesh position={[0, 0.7, 0.36]}>
              <planeGeometry args={[0.22, 0.28]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        ))
      )}

      <mesh position={[0, 0.35, 0.78]}>
        <boxGeometry args={[1.2, 0.06, 0.06]} />
        <meshStandardMaterial ref={material} color={color} emissive={color} toneMapped={false} />
      </mesh>
      {telemetry.health === "critical" ? <pointLight color={color} intensity={3} distance={4} position={[0, 1, 0]} /> : null}
      <Html position={[0, -0.12, 1.3]} center zIndexRange={[10, 0]}>
        <button
          onClick={onSelect}
          aria-label={`Select ${node.name}`}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 text-[10px] font-semibold tracking-wider ${
            selected ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white/95 text-slate-700"
          }`}
        >
          {node.id}
          <StatusDot color={color} />
        </button>
      </Html>
    </group>
  );
}

export default function GridScene({
  telemetry,
  selected,
  onSelect,
  resetKey
}: {
  telemetry: Record<string, Telemetry>;
  selected: string;
  onSelect: (id: string) => void;
  resetKey: number;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <SceneBoundary>
      <Canvas
        key={resetKey}
        camera={{ position: [14, 14, 17], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        fallback={<p className="p-8">WebGL is unavailable. Use the node list to control the simulator.</p>}
      >
        <color attach="background" args={["#f8fafc"]} />
        <fog attach="fog" args={["#f8fafc", 24, 58]} />
        <ambientLight intensity={1.55} />
        <directionalLight position={[4, 12, 5]} intensity={2.2} color="#f8fafc" />
        <gridHelper args={[50, 50, "#cbd5e1", "#e2e8f0"]} />
        {EDGES.map(([a, b]) => {
          const start = NODES.find((node) => node.id === a)!.position;
          const end = NODES.find((node) => node.id === b)!.position;
          const fault = telemetry[a].health === "critical" || telemetry[b].health === "critical";
          return (
            <Line
              key={`${a}-${b}`}
              points={[[start[0], 0.3, start[2]], [start[0], 0.3, end[2]], [end[0], 0.3, end[2]]]}
              color={fault ? COLORS.critical : "#0f766e"}
              lineWidth={fault ? 3 : 2}
            />
          );
        })}
        {NODES.map((node) => (
          <Node
            key={node.id}
            node={node}
            telemetry={telemetry[node.id]}
            selected={selected === node.id}
            onSelect={() => onSelect(node.id)}
            reducedMotion={reducedMotion}
          />
        ))}
        <OrbitControls makeDefault minDistance={9} maxDistance={35} maxPolarAngle={Math.PI / 2.15} target={[0.5, 0, 0]} enableDamping />
      </Canvas>
    </SceneBoundary>
  );
}
