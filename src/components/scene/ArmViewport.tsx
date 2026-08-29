import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { ARM_DIM, BIN_POS, BIN_RIGHT, KIND_META, PRINTER, type WorldPart } from "@/lib/arm/types";
import { useArm, visual } from "@/lib/arm/store";

const D2R = Math.PI / 180;

export const viewApi = { reset: () => {} };

type Mats = ReturnType<typeof useMat>;

function useMat() {
  return useMemo(
    () => ({
      pla: { color: "#32362e", roughness: 0.74, metalness: 0.05 },
      plaLight: { color: "#42483e", roughness: 0.68, metalness: 0.06 },
      servo: { color: "#141414", roughness: 0.34, metalness: 0.32 },
      horn: { color: "#c8ccc4", roughness: 0.28, metalness: 0.66 },
      steel: { color: "#7a818c", roughness: 0.22, metalness: 0.78 },
      ink: { color: "#101210", roughness: 0.86, metalness: 0.04 },
      part: { color: "#d9d0bf", roughness: 0.52, metalness: 0.04 },
      pad: { color: "#6e7478", roughness: 0.55, metalness: 0.08 },
      table: { color: "#161814", roughness: 0.9, metalness: 0.02 },
      cam: { color: "#1c1e18", roughness: 0.4, metalness: 0.2 },
    }),
    [],
  );
}

function Servo({ m, scale = 1 }: { m: Mats; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.023, 0.022, 0.0124]} />
        <meshStandardMaterial {...m.servo} />
      </mesh>
      <mesh position={[0, -0.012, 0]} castShadow>
        <boxGeometry args={[0.032, 0.0026, 0.0124]} />
        <meshStandardMaterial {...m.servo} />
      </mesh>
      <mesh position={[0.006, 0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0058, 0.0058, 0.005, 16]} />
        <meshStandardMaterial {...m.horn} />
      </mesh>
    </group>
  );
}

function Link({ m, length, wide = 0.016 }: { m: Mats; length: number; wide?: number }) {
  const r = wide / 2;
  return (
    <group>
      <mesh position={[0, 0, length / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r * 0.92, r, length, 12]} />
        <meshStandardMaterial {...m.pla} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r * 1.15, r * 1.15, 0.01, 14]} />
        <meshStandardMaterial {...m.plaLight} />
      </mesh>
      <mesh position={[0, 0, length]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r * 0.95, r * 0.95, 0.01, 14]} />
        <meshStandardMaterial {...m.plaLight} />
      </mesh>
    </group>
  );
}

function Ticker() {
  useFrame((_, dt) => {
    useArm.getState().tick(Math.min(dt, 0.1));
  });
  return null;
}

function ArmRig({ m }: { m: Mats }) {
  const base = useRef<Group>(null);
  const shoulder = useRef<Group>(null);
  const elbow = useRef<Group>(null);
  const wrist = useRef<Group>(null);
  const jawL = useRef<Mesh>(null);
  const jawR = useRef<Mesh>(null);
  const { l1, l2, l3 } = ARM_DIM;

  useFrame(() => {
    const j = visual.current;
    if (base.current) base.current.rotation.y = (j.base - 90) * D2R;
    if (shoulder.current) shoulder.current.rotation.x = (90 - j.shoulder) * D2R;
    if (elbow.current) elbow.current.rotation.x = (90 - j.elbow) * D2R;
    if (wrist.current) wrist.current.rotation.x = (90 - j.wrist) * D2R;
    const open = 0.002 + (j.grip / 90) * 0.016;
    if (jawL.current) jawL.current.position.x = -open - 0.007;
    if (jawR.current) jawR.current.position.x = open + 0.007;
  });

  return (
    <group>
      <mesh position={[0, 0.005, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.048, 0.052, 0.01, 28]} />
        <meshStandardMaterial {...m.pla} />
      </mesh>
      <mesh position={[0, 0.016, 0]} castShadow>
        <cylinderGeometry args={[0.026, 0.03, 0.016, 24]} />
        <meshStandardMaterial {...m.plaLight} />
      </mesh>
      <group ref={base} position={[0, 0.026, 0]}>
        <Servo m={m} />
        <mesh position={[0, 0.012, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.02, 0.012, 20]} />
          <meshStandardMaterial {...m.pla} />
        </mesh>
        <group ref={shoulder} position={[0, 0.016, 0]}>
          <group rotation={[0, 0, Math.PI / 2]} position={[-0.014, 0, 0]}>
            <Servo m={m} />
          </group>
          <Link m={m} length={l1} />
          <group ref={elbow} position={[0, 0, l1]}>
            <group rotation={[0, 0, Math.PI / 2]}>
              <Servo m={m} />
            </group>
            <Link m={m} length={l2} wide={0.014} />
            <group ref={wrist} position={[0, 0, l2]}>
              <Servo m={m} scale={0.82} />
              <mesh position={[0, 0, 0.01]} castShadow>
                <boxGeometry args={[0.022, 0.016, 0.024]} />
                <meshStandardMaterial {...m.pla} />
              </mesh>
              <group position={[0, 0, l3 - 0.01]}>
                <mesh castShadow>
                  <boxGeometry args={[0.028, 0.016, 0.022]} />
                  <meshStandardMaterial {...m.plaLight} />
                </mesh>
                <mesh position={[0, 0.01, -0.004]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.004, 0.004, 0.01, 10]} />
                  <meshStandardMaterial {...m.pad} />
                </mesh>
                <mesh position={[0.007, 0.01, -0.004]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.003, 0.003, 0.008, 8]} />
                  <meshStandardMaterial {...m.horn} />
                </mesh>
                <mesh ref={jawL} position={[-0.01, 0, 0.016]} castShadow>
                  <boxGeometry args={[0.005, 0.014, 0.038]} />
                  <meshStandardMaterial {...m.pad} />
                </mesh>
                <mesh ref={jawR} position={[0.01, 0, 0.016]} castShadow>
                  <boxGeometry args={[0.005, 0.014, 0.038]} />
                  <meshStandardMaterial {...m.pad} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function Printer({ m }: { m: Mats }) {
  const o = PRINTER.origin;
  const s = PRINTER.bedSize;
  const down = useRef<{ x: number; y: number } | null>(null);
  return (
    <group position={[o[0], 0, o[2]]}>
      {[
        [-s / 2, s / 2],
        [s / 2, s / 2],
        [-s / 2, -s / 2],
        [s / 2, -s / 2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.11, z]} castShadow>
          <boxGeometry args={[0.009, 0.22, 0.009]} />
          <meshStandardMaterial {...m.ink} />
        </mesh>
      ))}
      <mesh position={[0, 0.222, 0]} castShadow>
        <boxGeometry args={[s + 0.018, 0.008, s + 0.018]} />
        <meshStandardMaterial {...m.ink} />
      </mesh>
      <mesh position={[0, 0.21, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, s * 0.9, 8]} />
        <meshStandardMaterial {...m.steel} />
      </mesh>
      <mesh
        position={[0, PRINTER.bedY, 0]}
        receiveShadow
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (!down.current) return;
          if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6) return;
          e.stopPropagation();
          useArm.getState().goToPoint([e.point.x, PRINTER.bedY + 0.03, e.point.z]);
        }}
      >
        <boxGeometry args={[s * 0.9, 0.005, s * 0.9]} />
        <meshStandardMaterial {...m.steel} />
      </mesh>
      <mesh position={[0, PRINTER.bedY + 0.0032, 0]} receiveShadow>
        <boxGeometry args={[s * 0.78, 0.001, s * 0.78]} />
        <meshStandardMaterial color="#3a3e38" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.186, s / 2 - 0.006]} castShadow>
        <boxGeometry args={[s * 0.88, 0.007, 0.01]} />
        <meshStandardMaterial {...m.plaLight} />
      </mesh>
      <mesh position={[0.028, 0.168, s / 2 - 0.018]} castShadow>
        <boxGeometry args={[0.026, 0.038, 0.03]} />
        <meshStandardMaterial {...m.servo} />
      </mesh>
      <group position={[0.04, 0.214, -s / 2 + 0.01]} rotation={[1.05, 0.08, 0]}>
        <mesh position={[0, 0.012, 0]} castShadow>
          <boxGeometry args={[0.006, 0.028, 0.006]} />
          <meshStandardMaterial {...m.pla} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.008, 0.027]} />
          <meshStandardMaterial {...m.cam} />
        </mesh>
        <mesh position={[0.01, -0.007, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0062, 0.0076, 0.01, 16]} />
          <meshStandardMaterial color="#101210" roughness={0.45} />
        </mesh>
        <mesh position={[0.01, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.005, 12]} />
          <meshStandardMaterial color="#4a5648" emissive="#6a7a68" emissiveIntensity={0.55} />
        </mesh>
      </group>
    </group>
  );
}

function PartMesh({ part }: { part: WorldPart }) {
  const ref = useRef<Group>(null);
  const meta = KIND_META[part.kind];
  useFrame(() => {
    const live = visual.parts.find((p) => p.id === part.id);
    if (!ref.current || !live) return;
    ref.current.position.set(live.pos[0], live.pos[1], live.pos[2]);
  });
  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        useArm.getState().grabPart(part.id);
      }}
    >
      {part.kind === "petg" ? (
        <mesh castShadow>
          <cylinderGeometry args={[0.009, 0.011, 0.022, 12]} />
          <meshStandardMaterial color={meta.color} roughness={0.38} metalness={0.12} />
        </mesh>
      ) : part.kind === "fail" ? (
        <mesh castShadow rotation={[0.2, 0.4, 0.1]}>
          <boxGeometry args={[0.022, 0.014, 0.022]} />
          <meshStandardMaterial color={meta.color} roughness={0.62} />
        </mesh>
      ) : (
        <>
          <mesh castShadow>
            <boxGeometry args={[0.022, 0.016, 0.022]} />
            <meshStandardMaterial color={meta.color} roughness={0.52} />
          </mesh>
          <mesh position={[0, 0.011, 0]} castShadow>
            <cylinderGeometry args={[0.006, 0.007, 0.008, 10]} />
            <meshStandardMaterial color={meta.accent} roughness={0.48} />
          </mesh>
        </>
      )}
    </group>
  );
}

function TDisplayBoard({ m }: { m: Mats }) {
  return (
    <group position={[0.135, 0.02, 0.04]} rotation={[-1.12, -0.55, 0.05]}>
      <mesh castShadow>
        <boxGeometry args={[0.064, 0.007, 0.033]} />
        <meshStandardMaterial {...m.cam} />
      </mesh>
      <mesh position={[0.002, 0.0044, 0]}>
        <boxGeometry args={[0.048, 0.001, 0.026]} />
        <meshStandardMaterial color="#0b0c0b" emissive="#3e4a3c" emissiveIntensity={0.7} roughness={0.28} />
      </mesh>
    </group>
  );
}

function Bin({
  m,
  position,
  tone,
}: {
  m: Mats;
  position: [number, number, number];
  tone: string;
}) {
  const down = useRef<{ x: number; y: number } | null>(null);
  return (
    <group
      position={position}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!down.current) return;
        if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6) return;
        e.stopPropagation();
        useArm.getState().goToPoint([position[0], 0.06, position[2]]);
      }}
    >
      <mesh receiveShadow>
        <boxGeometry args={[0.068, 0.004, 0.068]} />
        <meshStandardMaterial color={tone} roughness={0.7} />
      </mesh>
      {[
        [0.033, 0, 0, 0.004, 0.03, 0.068],
        [-0.033, 0, 0, 0.004, 0.03, 0.068],
        [0, 0, 0.033, 0.068, 0.03, 0.004],
        [0, 0, -0.033, 0.068, 0.03, 0.004],
      ].map((a, i) => (
        <mesh key={i} position={[a[0], a[1] + 0.014, a[2]]} castShadow>
          <boxGeometry args={[a[3], a[4], a[5]]} />
          <meshStandardMaterial {...m.plaLight} />
        </mesh>
      ))}
    </group>
  );
}

function Floor() {
  const down = useRef<{ x: number; y: number } | null>(null);
  const m = useMat();
  return (
    <mesh
      position={[0.02, -0.006, 0.1]}
      receiveShadow
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!down.current) return;
        if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6) return;
        e.stopPropagation();
        useArm.getState().goToPoint([e.point.x, 0.04, e.point.z]);
      }}
    >
      <boxGeometry args={[0.56, 0.012, 0.5]} />
      <meshStandardMaterial {...m.table} />
    </mesh>
  );
}

function Scene() {
  const m = useMat();
  return (
    <>
      <color attach="background" args={["#0b0c0b"]} />
      <hemisphereLight args={["#e6eadc", "#161810", 0.55]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[0.42, 0.72, 0.32]}
        intensity={1.85}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-camera-near={0.08}
        shadow-camera-far={1.5}
        shadow-camera-left={-0.32}
        shadow-camera-right={0.32}
        shadow-camera-top={0.32}
        shadow-camera-bottom={-0.32}
      />
      <directionalLight position={[-0.35, 0.25, -0.4]} intensity={0.28} />
      <Floor />
      <Grid
        infiniteGrid
        fadeDistance={1.1}
        fadeStrength={2.6}
        sectionColor="#2a2c26"
        cellColor="#1c1e18"
        sectionSize={0.2}
        cellSize={0.05}
        position={[0, 0.001, 0]}
      />
      <Ticker />
      <ArmRig m={m} />
      <Printer m={m} />
      {visual.parts.map((p) => (
        <PartMesh key={p.id} part={p} />
      ))}
      <Bin m={m} position={BIN_POS} tone="#2e382c" />
      <Bin m={m} position={BIN_RIGHT} tone="#2a2e38" />
      <TDisplayBoard m={m} />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.45} scale={1.2} blur={2.4} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.2}
        maxDistance={0.95}
        maxPolarAngle={Math.PI / 2.08}
        target={[0.01, 0.08, 0.11]}
        ref={(el) => {
          if (el) viewApi.reset = () => el.reset();
        }}
      />
    </>
  );
}

export function ArmViewport() {
  return (
    <div className="relative h-full min-h-[220px] w-full touch-none bg-bg">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ position: [0.28, 0.2, 0.32], fov: 30, near: 0.02, far: 6 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}