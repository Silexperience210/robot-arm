import { ARM_DIM, HOME_JOINTS, PRINTER, type Joints, type Vec3 } from "./types";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function clampJoints(j: Joints): Joints {
  return {
    base: clamp(j.base, 0, 180),
    shoulder: clamp(j.shoulder, 5, 175),
    elbow: clamp(j.elbow, 5, 175),
    wrist: clamp(j.wrist, 5, 175),
    grip: clamp(j.grip, 0, 90),
  };
}

export function lerpJoints(a: Joints, b: Joints, t: number): Joints {
  const k = clamp(t, 0, 1);
  return {
    base: a.base + (b.base - a.base) * k,
    shoulder: a.shoulder + (b.shoulder - a.shoulder) * k,
    elbow: a.elbow + (b.elbow - a.elbow) * k,
    wrist: a.wrist + (b.wrist - a.wrist) * k,
    grip: a.grip + (b.grip - a.grip) * k,
  };
}

export function maxJointError(a: Joints, b: Joints) {
  return Math.max(
    Math.abs(a.base - b.base),
    Math.abs(a.shoulder - b.shoulder),
    Math.abs(a.elbow - b.elbow),
    Math.abs(a.wrist - b.wrist),
    Math.abs(a.grip - b.grip),
  );
}

function yawFromBase(base: number) {
  return (base - 90) * D2R;
}

function polar(radius: number, y: number, φ: number): Vec3 {
  return [radius * Math.sin(φ), y, radius * Math.cos(φ)];
}

export type Chain = {
  tcp: Vec3;
  toolDir: Vec3;
  yaw: number;
  elbow: Vec3;
  wrist: Vec3;
  shoulder: Vec3;
};

/** Forward kinematics matching the Three.js joint hierarchy. */
export function forwardKinematics(j: Joints): Chain {
  const { baseHeight: H, l1, l2, l3 } = ARM_DIM;
  const φ = yawFromBase(j.base);
  const θs = (90 - j.shoulder) * D2R;
  const θe = (90 - j.elbow) * D2R;
  const θw = (90 - j.wrist) * D2R;
  const p1 = θs;
  const p2 = θs + θe;
  const p3 = θs + θe + θw;

  const shoulder: Vec3 = [0, H, 0];
  const eR = l1 * Math.cos(p1);
  const eY = H - l1 * Math.sin(p1);
  const elbow = polar(eR, eY, φ);
  const wR = eR + l2 * Math.cos(p2);
  const wY = eY - l2 * Math.sin(p2);
  const wrist = polar(wR, wY, φ);
  const tR = wR + l3 * Math.cos(p3);
  const tY = wY - l3 * Math.sin(p3);
  const tcp = polar(tR, tY, φ);
  const dirZ = Math.cos(p3);
  const toolDir: Vec3 = [dirZ * Math.sin(φ), -Math.sin(p3), dirZ * Math.cos(φ)];
  return { tcp, toolDir, yaw: φ, elbow, wrist, shoulder };
}

function rotateY(v: Vec3, φ: number): Vec3 {
  const c = Math.cos(φ);
  const s = Math.sin(φ);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

const PITCHES = [-88, -80, -70, -58, -45, -32, -20, -8];

function ikAtPitch(
  target: Vec3,
  grip: number,
  toolPitchDeg: number,
  elbowUp: boolean,
): Joints | null {
  const { baseHeight: H, l1, l2, l3 } = ARM_DIM;
  const φ = Math.atan2(target[0], target[2]);
  const r = Math.hypot(target[0], target[2]);
  const tool = toolPitchDeg * D2R;
  const wr = r - l3 * Math.cos(tool);
  const wy = target[1] - H - l3 * Math.sin(tool);
  if (wr < 0.012) return null;
  const d = Math.hypot(wr, wy);
  const maxReach = l1 + l2 - 0.003;
  const minReach = Math.abs(l1 - l2) + 0.01;
  if (d > maxReach + 0.012 || d < minReach - 0.006) return null;
  const dClamped = clamp(d, minReach, maxReach);
  const wrU = wr * (dClamped / d);
  const wyU = wy * (dClamped / d);

  const cosEl = clamp((l1 * l1 + l2 * l2 - dClamped * dClamped) / (2 * l1 * l2), -1, 1);
  const interior = Math.acos(cosEl);
  const elbowDown = interior * R2D - 90;
  const elbow = elbowUp ? 180 - elbowDown : elbowDown;
  if (elbow < 4 || elbow > 176) return null;

  const alpha = Math.atan2(wyU, wrU);
  const cosB = clamp((l1 * l1 + dClamped * dClamped - l2 * l2) / (2 * l1 * dClamped), -1, 1);
  const beta = Math.acos(cosB);
  const shFrom = (elbowUp ? alpha - beta : alpha + beta) * R2D;
  const shoulder = 90 + shFrom;
  if (shoulder < 4 || shoulder > 176) return null;
  const wrist = 90 + toolPitchDeg - (shoulder - 90) - (elbow - 90);
  if (wrist < 2 || wrist > 178) return null;
  const base = φ * R2D + 90;
  if (base < 0 || base > 180) return null;
  return clampJoints({ base, shoulder, elbow, wrist, grip });
}

/**
 * Search tool pitch + elbow config, pick the pose whose TCP is closest
 * to the target and that clears the printer.
 */
export function solveIK(target: Vec3, grip: number, preferClear = true): Joints {
  let best: Joints | null = null;
  let bestScore = Infinity;
  for (const pitch of PITCHES) {
    for (const up of [false, true]) {
      const j = ikAtPitch(target, grip, pitch, up);
      if (!j) continue;
      const fk = forwardKinematics(j);
      const err = dist(fk.tcp, target);
      const hit = preferClear ? jointsHitPrinter(j) : null;
      const clampPen =
        (j.shoulder <= 6 || j.shoulder >= 174 ? 0.02 : 0) +
        (j.elbow <= 6 || j.elbow >= 174 ? 0.02 : 0) +
        (j.wrist <= 6 || j.wrist >= 174 ? 0.015 : 0);
      const downBonus = target[1] < 0.05 && fk.toolDir[1] < -0.7 ? -0.02 : 0;
      const foldPen = j.elbow > 110 ? 0.012 : 0;
      const score = err + (hit ? 0.22 : 0) + clampPen + (up ? 0.012 : 0) + downBonus + foldPen;
      if (score < bestScore) {
        bestScore = score;
        best = j;
      }
    }
  }
  return best ?? { ...VIA_JOINTS, grip };
}

export function inverseKinematics(
  target: Vec3,
  grip: number,
  toolPitchDeg?: number,
): Joints | null {
  if (toolPitchDeg == null) return solveIK(target, grip);
  return (
    ikAtPitch(target, grip, toolPitchDeg, false) ??
    ikAtPitch(target, grip, toolPitchDeg, true) ??
    solveIK(target, grip)
  );
}

export function nudgeCartesian(
  joints: Joints,
  axis: "x" | "y" | "z",
  meters: number,
): Joints {
  const { tcp } = forwardKinematics(joints);
  const t: Vec3 = [...tcp];
  if (axis === "x") t[0] += meters;
  if (axis === "y") t[1] += meters;
  if (axis === "z") t[2] += meters;
  t[1] = clamp(t[1], 0.016, 0.24);
  return solveIK(t, joints.grip);
}

export function lookAt(joints: Joints, point: Vec3, grip = joints.grip): Joints {
  return solveIK(point, grip);
}

export function gripGapMeters(grip: number) {
  return 0.004 + (clamp(grip, 0, 90) / 90) * 0.036;
}

export function defaultPose(): Joints {
  return { ...HOME_JOINTS };
}

export function dist(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function quintic(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (6 * x - 15) + 10);
}

export function durationFor(a: Joints, b: Joints, speed: number) {
  return Math.max(0.22, maxJointError(a, b) / (42 + 95 * speed));
}

export function reachRatio(tcp: Vec3) {
  const { baseHeight: H, l1, l2, l3 } = ARM_DIM;
  return Math.hypot(tcp[0], tcp[2], tcp[1] - H) / (l1 + l2 + l3);
}

export function simulateUltrasonic(
  tcp: Vec3,
  toolDir: Vec3,
  parts: Vec3[],
  held: boolean,
) {
  if (held) return 2.4;
  let nearest = 80;
  for (const p of parts) nearest = Math.min(nearest, dist(tcp, p) * 100);
  const bedY = PRINTER.bedY;
  const along = toolDir[1] < -0.2 ? ((tcp[1] - bedY) / Math.max(0.05, -toolDir[1])) * 100 : 40;
  return clamp(Math.min(nearest, along), 1.2, 80);
}

const o = PRINTER.origin;
const s = PRINTER.bedSize;
const POSTS: [number, number][] = [
  [o[0] - s / 2, o[2] - s / 2],
  [o[0] + s / 2, o[2] - s / 2],
  [o[0] - s / 2, o[2] + s / 2],
  [o[0] + s / 2, o[2] + s / 2],
];
export const PRINTER_FRONT_Z = o[2] - s / 2;
export const PRINTER_TOP_Y = 0.222;

export function inPrinterColumn(p: Vec3): boolean {
  return (
    Math.abs(p[0] - o[0]) < s / 2 - 0.006 &&
    Math.abs(p[2] - o[2]) < s / 2 - 0.006 &&
    p[1] > PRINTER.bedY - 0.02 &&
    p[1] < 0.23
  );
}

/** Solids: 4 posts + top plate. Bed is ignored so the gripper can work above it. */
export function pointHitsPrinter(p: Vec3): string | null {
  const [x, y, z] = p;
  if (y < 0.004) return "sol";
  for (const [px, pz] of POSTS) {
    if (Math.abs(x - px) < 0.02 && Math.abs(z - pz) < 0.02 && y >= 0 && y <= 0.232) {
      return "montant";
    }
  }
  if (
    Math.abs(x - o[0]) < s / 2 + 0.024 &&
    Math.abs(z - o[2]) < s / 2 + 0.024 &&
    y >= 0.205 &&
    y <= 0.242
  ) {
    return "portique";
  }
  return null;
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function chainSamples(fk: Chain): Vec3[] {
  const out: Vec3[] = [fk.elbow, fk.wrist, fk.tcp];
  for (let i = 1; i < 5; i++) out.push(lerp3(fk.shoulder, fk.elbow, i / 5));
  for (let i = 1; i < 5; i++) out.push(lerp3(fk.elbow, fk.wrist, i / 5));
  for (let i = 1; i < 4; i++) out.push(lerp3(fk.wrist, fk.tcp, i / 4));
  return out;
}

export function jointsHitPrinter(j: Joints): string | null {
  const fk = forwardKinematics(j);
  for (const p of chainSamples(fk)) {
    const h = pointHitsPrinter(p);
    if (h) return h;
  }
  return null;
}

export function segmentHitsPrinter(a: Vec3, b: Vec3): boolean {
  for (let i = 1; i < 12; i++) {
    const p = lerp3(a, b, i / 12);
    if (pointHitsPrinter(p)) return true;
    if (inPrinterColumn(p) && p[1] > 0.195) return true;
  }
  const aIn = inPrinterColumn(a);
  const bIn = inPrinterColumn(b);
  if (aIn !== bIn) {
    for (let i = 1; i < 12; i++) {
      const y = a[1] + (b[1] - a[1]) * (i / 12);
      if (y > 0.185) return true;
    }
  }
  return false;
}

export function jointsSegmentHits(a: Joints, b: Joints): boolean {
  for (let i = 1; i < 16; i++) {
    const j = lerpJoints(a, b, i / 16);
    if (jointsHitPrinter(j)) return true;
  }
  return false;
}

/** Extended pose in front of the printer — the only door in/out of the frame. */
export const VIA_JOINTS: Joints = {
  base: 90,
  shoulder: 173,
  elbow: 8,
  wrist: 8,
  grip: 70,
};

/** Folded over the base (z≈0) — intermediate before max park. */
export const FOLD_JOINTS: Joints = {
  base: 90,
  shoulder: 120,
  elbow: 175,
  wrist: 170,
  grip: 40,
};

/** Maximum retract: arm folded behind the base, opposite the printer. */
export const PARK_JOINTS: Joints = {
  base: 90,
  shoulder: 175,
  elbow: 175,
  wrist: 168,
  grip: 40,
};

function g(j: Joints, grip: number): Joints {
  return { ...j, grip };
}

const GRAPH_SEEDS: Joints[] = [
  VIA_JOINTS,
  { base: 40, shoulder: 173, elbow: 8, wrist: 8, grip: 70 },
  { base: 55, shoulder: 173, elbow: 8, wrist: 8, grip: 70 },
  { base: 125, shoulder: 173, elbow: 8, wrist: 8, grip: 70 },
  { base: 140, shoulder: 173, elbow: 8, wrist: 8, grip: 70 },
  { base: 40, shoulder: 150, elbow: 18, wrist: 28, grip: 70 },
  { base: 55, shoulder: 150, elbow: 18, wrist: 28, grip: 70 },
  { base: 125, shoulder: 150, elbow: 18, wrist: 28, grip: 70 },
  { base: 140, shoulder: 150, elbow: 18, wrist: 28, grip: 70 },
  { base: 90, shoulder: 155, elbow: 22, wrist: 22, grip: 70 },
  { base: 36, shoulder: 145, elbow: 20, wrist: 35, grip: 70 },
  { base: 144, shoulder: 145, elbow: 20, wrist: 35, grip: 70 },
  FOLD_JOINTS,
  { base: 50, shoulder: 120, elbow: 175, wrist: 170, grip: 40 },
  { base: 130, shoulder: 120, elbow: 175, wrist: 170, grip: 40 },
  PARK_JOINTS,
  { base: 140, shoulder: 175, elbow: 175, wrist: 168, grip: 40 },
  { base: 40, shoulder: 175, elbow: 175, wrist: 168, grip: 40 },
  { base: 60, shoulder: 175, elbow: 175, wrist: 168, grip: 40 },
  { base: 120, shoulder: 175, elbow: 175, wrist: 168, grip: 40 },
];

function clearSeg(a: Joints, b: Joints): boolean {
  if (jointsHitPrinter(b)) return false;
  return !jointsSegmentHits(a, b);
}

function samePose(a: Joints, b: Joints) {
  return maxJointError(a, b) < 3;
}

/** Collision-free joint-space path from a to b, inserting detours around the frame. */
export function connectJoints(from: Joints, to: Joints): Joints[] {
  const tgt = { ...to };
  if (jointsHitPrinter(tgt)) {
    const door = g(VIA_JOINTS, tgt.grip);
    return clearSeg(from, door) ? [door] : [];
  }
  if (clearSeg(from, tgt)) return [tgt];

  // Yaw first at the current configuration — avoids sweeping the tool through a post.
  if (Math.abs(from.base - tgt.base) > 8) {
    const yawed = { ...from, base: tgt.base };
    if (!jointsHitPrinter(yawed) && clearSeg(from, yawed) && clearSeg(yawed, tgt)) {
      return [yawed, tgt];
    }
    const yawDoor = g({ ...VIA_JOINTS, base: tgt.base }, tgt.grip);
    if (!jointsHitPrinter(yawDoor) && clearSeg(from, yawDoor) && clearSeg(yawDoor, tgt)) {
      return samePose(from, yawDoor) ? [tgt] : [yawDoor, tgt];
    }
  }

  const nodes: Joints[] = [
    from,
    tgt,
    { ...from, base: tgt.base, grip: tgt.grip },
    { ...tgt, base: from.base },
    g({ ...VIA_JOINTS, base: tgt.base }, tgt.grip),
    g({ ...VIA_JOINTS, base: from.base }, tgt.grip),
    ...GRAPH_SEEDS.map((s) => g(s, tgt.grip)),
  ];
  const n = nodes.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      if (clearSeg(nodes[i], nodes[k])) {
        adj[i].push(k);
        adj[k].push(i);
      }
    }
  }

  const prev = new Array<number>(n).fill(-1);
  const q = [0];
  prev[0] = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    if (i === 1) break;
    for (const k of adj[i]) {
      if (prev[k] === -1) {
        prev[k] = i;
        q.push(k);
      }
    }
  }

  if (prev[1] !== -1) {
    const path: Joints[] = [];
    for (let i = 1; i !== 0; i = prev[i]) path.push(nodes[i]);
    path.reverse();
    return path.filter((p, idx) => idx === path.length - 1 || !samePose(p, idx ? path[idx - 1] : from));
  }

  const door = g(VIA_JOINTS, tgt.grip);
  const park = g(PARK_JOINTS, tgt.grip);
  if (clearSeg(from, door) && clearSeg(door, tgt)) return samePose(from, door) ? [tgt] : [door, tgt];
  if (clearSeg(from, door) && clearSeg(door, park) && clearSeg(park, door) && clearSeg(door, tgt)) {
    return [door, park, door, tgt].filter((p, idx, arr) => idx === 0 || !samePose(p, arr[idx - 1]));
  }
  return [];
}

export const SAFE_VIA: Vec3 = [0, 0.104, 0.129];

function doorOf(p: Vec3): Vec3 {
  return [clamp(p[0], o[0] - 0.03, o[0] + 0.03), 0.12, PRINTER_FRONT_Z - 0.02];
}

function sideVia(p: Vec3): Vec3 {
  const left = p[0] < o[0];
  return [left ? -0.13 : 0.145, 0.12, 0.12];
}

/** Cartesian waypoints that go around the frame instead of through it. */
export function cartesianPath(from: Vec3, to: Vec3): Vec3[] {
  const fromIn = inPrinterColumn(from);
  const toIn = inPrinterColumn(to);
  const out: Vec3[] = [];
  const push = (p: Vec3) => {
    if (!out.length || dist(out[out.length - 1], p) > 0.018) out.push(p);
  };

  if (fromIn && toIn) {
    push([from[0], 0.128, from[2]]);
    push([to[0], 0.128, to[2]]);
    push(to);
    return out;
  }
  if (fromIn && !toIn) {
    push([from[0], Math.min(0.132, Math.max(from[1] + 0.035, 0.12)), from[2]]);
    push(doorOf(from));
    push(SAFE_VIA);
    if (segmentHitsPrinter(SAFE_VIA, to)) push(sideVia(to));
    push(to);
    return out;
  }
  if (!fromIn && toIn) {
    if (segmentHitsPrinter(from, SAFE_VIA)) push(sideVia(from));
    push(SAFE_VIA);
    push(doorOf(to));
    push([to[0], 0.128, to[2]]);
    push(to);
    return out;
  }
  if (segmentHitsPrinter(from, to)) {
    push(SAFE_VIA);
    if (segmentHitsPrinter(SAFE_VIA, to)) push(sideVia(to));
  }
  push(to);
  return out;
}

export function hazard(tcp: Vec3, us: number): string | null {
  if (tcp[1] < 0.007) return "sol";
  const hit = pointHitsPrinter(tcp);
  if (hit) return hit;
  if (us < 3.2) return "proximité";
  return null;
}

export { rotateY };
