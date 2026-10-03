"use client";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { COLORS, EDGES, NODES, type GridNode, type Telemetry } from "@/lib/grid";

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="flex h-full items-center justify-center p-12 text-center text-sm text-slate-400">3D rendering is unavailable. Enable WebGL or use the node list below to inspect telemetry and simulate faults.</div> : this.props.children; }
}
function Node({ node, telemetry, selected, onSelect, reducedMotion }: { node: GridNode; telemetry: Telemetry; selected: boolean; onSelect: () => void; reducedMotion: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = COLORS[telemetry.health];
  useFrame(({ clock }) => {
    const pulse = telemetry.health === "critical" && !reducedMotion ? (Math.sin(clock.elapsedTime * 4) + 1) / 2 : 0;
    if (ring.current) ring.current.scale.setScalar(1 + pulse * .25);
    if (material.current) material.current.emissiveIntensity = .4 + pulse * 1.8;
  });
  return <group position={node.position} onClick={e => { e.stopPropagation(); onSelect(); }}>
    <mesh position={[0, .12, 0]}><boxGeometry args={[1.8, .24, 1.5]} /><meshStandardMaterial color={selected ? "#164e63" : "#172638"} metalness={.7} roughness={.35} /></mesh>
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, .015, 0]}><ringGeometry args={[1.08, 1.13, 48]} /><meshBasicMaterial color={selected ? "#67e8f9" : color} transparent opacity={selected ? 1 : .65} side={THREE.DoubleSide} /></mesh>
    {node.kind === "Substation" ? <>
      <mesh position={[0, .8, 0]}><boxGeometry args={[1.25, 1.15, .95]} /><meshStandardMaterial color="#426079" metalness={.75} roughness={.3} /></mesh>
      {[-.4, .4].map(x => <mesh key={x} position={[x, 1.65, 0]}><cylinderGeometry args={[.12, .18, .65, 12]} /><meshStandardMaterial color="#91a9bc" metalness={.7} roughness={.3} /></mesh>)}
    </> : node.kind === "Feeder" ? <>
      <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[.12, .2, 1.9, 8]} /><meshStandardMaterial color="#64748b" metalness={.8} roughness={.3} /></mesh>
      {[1.5, 1.95].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[1.5, .12, .14]} /><meshStandardMaterial color="#91a9bc" /></mesh>)}
    </> : [-.42, .42].map((x, i) => <group key={x} position={[x, 0, i * .2]}>
      <mesh position={[0, .65, 0]}><boxGeometry args={[.6, .8, .7]} /><meshStandardMaterial color="#3b5269" /></mesh>
      <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[.53, .4, 4]} /><meshStandardMaterial color="#7891a6" /></mesh>
      <mesh position={[0, .7, .36]}><planeGeometry args={[.22, .28]} /><meshBasicMaterial color={color} /></mesh>
    </group>)}
    <mesh position={[0, .35, .78]}><boxGeometry args={[1.2, .06, .06]} /><meshStandardMaterial ref={material} color={color} emissive={color} toneMapped={false} /></mesh>
    {telemetry.health === "critical" && <pointLight color={color} intensity={4} distance={4} position={[0, 1, 0]} />}
    <Html position={[0, -.12, 1.3]} center zIndexRange={[10, 0]}><button onClick={onSelect} aria-label={`Select ${node.name}`} className={`whitespace-nowrap rounded border px-2 py-1 text-[10px] font-semibold tracking-wider ${selected ? "border-cyan-500 bg-cyan-950 text-cyan-200" : "border-slate-700 bg-slate-950/90 text-slate-300"}`}>{node.id} <span className="ml-1" style={{ color }}>●</span></button></Html>
  </group>;
}
export default function GridScene({ telemetry, selected, onSelect, resetKey }: { telemetry: Record<string, Telemetry>; selected: string; onSelect: (id: string) => void; resetKey: number }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => { const query = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReducedMotion(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  return <SceneBoundary><Canvas key={resetKey} camera={{ position: [14, 14, 17], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true }} fallback={<p className="p-8">WebGL is unavailable. Use the node list to control the simulator.</p>}>
    <color attach="background" args={["#080f1f"]} /><fog attach="fog" args={["#080f1f", 23, 55]} />
    <ambientLight intensity={1.4} /><directionalLight position={[4, 12, 5]} intensity={2.5} color="#c3e8ff" />
    <gridHelper args={[50, 50, "#24354a", "#142338"]} />
    {EDGES.map(([a, b]) => { const start = NODES.find(n => n.id === a)!.position; const end = NODES.find(n => n.id === b)!.position; const fault = telemetry[a].health === "critical" || telemetry[b].health === "critical"; return <Line key={`${a}-${b}`} points={[[start[0], .3, start[2]], [start[0], .3, end[2]], [end[0], .3, end[2]]]} color={fault ? COLORS.critical : "#258697"} lineWidth={fault ? 3 : 2} />; })}
    {NODES.map(node => <Node key={node.id} node={node} telemetry={telemetry[node.id]} selected={selected === node.id} onSelect={() => onSelect(node.id)} reducedMotion={reducedMotion} />)}
    <OrbitControls makeDefault minDistance={9} maxDistance={35} maxPolarAngle={Math.PI / 2.15} target={[.5, 0, 0]} enableDamping />
  </Canvas></SceneBoundary>;
}
