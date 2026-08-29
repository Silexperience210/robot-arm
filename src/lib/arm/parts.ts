import {
  connectJoints,
  forwardKinematics,
  inPrinterColumn,
  maxJointError,
  PARK_JOINTS,
  solveIK,
  VIA_JOINTS,
  type Chain,
} from "./kinematics";
import {
  BIN_POS,
  BIN_RIGHT,
  HOME_JOINTS,
  KIND_META,
  PRINTER,
  type Joints,
  type Vec3,
  type Waypoint,
  type WorldPart,
} from "./types";

const BED: Vec3 = [PRINTER.origin[0], PRINTER.bedY + 0.012, PRINTER.origin[2] + 0.008];

export function seedParts(): WorldPart[] {
  const plaHome: Vec3 = [...BED];
  const petgHome: Vec3 = [BED[0] + 0.032, BED[1], BED[2] - 0.022];
  const failHome: Vec3 = [-0.132, 0.016, 0.118];
  return [
    { id: "pla", kind: "pla", pos: [...plaHome], home: plaHome, held: false },
    { id: "petg", kind: "petg", pos: [...petgHome], home: petgHome, held: false },
    { id: "fail", kind: "fail", pos: [...failHome], home: failHome, held: false },
  ];
}

export function resetParts(parts: WorldPart[]) {
  for (const p of parts) {
    p.pos = [...p.home];
    p.held = false;
  }
}

export function binFor(kind: WorldPart["kind"]): Vec3 {
  return KIND_META[kind].bin === "R" ? BIN_RIGHT : BIN_POS;
}

function wp(label: string, joints: Joints, holdMs = 280): Waypoint {
  return {
    id: Math.random().toString(36).slice(2, 9),
    label,
    joints: { ...joints },
    holdMs,
  };
}

function poseAt(p: Vec3, grip: number): Joints {
  return solveIK(p, grip);
}

function hoverY(p: Vec3) {
  if (inPrinterColumn(p)) return Math.min(0.128, Math.max(p[1] + 0.04, 0.118));
  return Math.max(p[1] + 0.052, 0.068);
}

function appendPose(wps: Waypoint[], cur: Joints, next: Joints, label: string, hold: number): Joints {
  const steps = connectJoints(cur, next);
  if (!steps.length) return cur;
  let last = cur;
  for (let i = 0; i < steps.length; i++) {
    const isLast = i === steps.length - 1;
    if (maxJointError(last, steps[i]) < 2.5 && !isLast) continue;
    wps.push(wp(isLast ? label : "Via", steps[i], isLast ? hold : 200));
    last = steps[i];
  }
  return last;
}

function followCart(wps: Waypoint[], start: Joints, target: Vec3, grip: number, label: string): Joints {
  let cur = start;
  const fromTcp = forwardKinematics(cur).tcp;
  const fromIn = inPrinterColumn(fromTcp);
  const toIn = inPrinterColumn(target);
  if (fromIn !== toIn) {
    cur = appendPose(wps, cur, { ...VIA_JOINTS, grip }, "Seuil", 220);
  }
  if (toIn) {
    const over: Vec3 = [target[0], hoverY(target), target[2]];
    cur = appendPose(wps, cur, poseAt(over, grip), `${label} survol`, 240);
  }
  return appendPose(wps, cur, poseAt(target, grip), label, 300);
}

/** Approach → pinch → lift → transit around the printer → drop. */
export function pickAndPlace(from: Vec3, to: Vec3, tag: string, start: Joints = HOME_JOINTS): Waypoint[] {
  const open = 82;
  const shut = 6;
  const hoverFrom: Vec3 = [from[0], hoverY(from), from[2]];
  const pick: Vec3 = [from[0], from[1] + 0.008, from[2]];
  const lift: Vec3 = [from[0], hoverY(from) + 0.01, from[2]];
  const hoverTo: Vec3 = [to[0], hoverY(to), to[2]];
  const drop: Vec3 = [to[0], to[1] + 0.022, to[2]];

  const wps: Waypoint[] = [];
  let cur = start;
  cur = followCart(wps, cur, hoverFrom, open, `${tag} approche`);
  cur = appendPose(wps, cur, poseAt(pick, open), `${tag} descente`, 400);
  cur = appendPose(wps, cur, poseAt(pick, shut), `${tag} prise`, 520);
  cur = appendPose(wps, cur, poseAt(lift, shut), `${tag} extract`, 320);
  cur = followCart(wps, cur, hoverTo, shut, `${tag} transit`);
  cur = appendPose(wps, cur, poseAt(drop, shut), `${tag} dépôt`, 360);
  cur = appendPose(wps, cur, poseAt(drop, 84), `${tag} relâche`, 280);
  appendPose(wps, cur, poseAt(hoverTo, 84), `${tag} dégage`, 200);
  return wps;
}

export function grabPath(part: WorldPart, start: Joints): Waypoint[] {
  const open = 84;
  const shut = 6;
  const tag = KIND_META[part.kind].label;
  const hover: Vec3 = [part.pos[0], hoverY(part.pos), part.pos[2]];
  const pick: Vec3 = [part.pos[0], part.pos[1] + 0.008, part.pos[2]];
  const lift: Vec3 = [part.pos[0], hoverY(part.pos) + 0.012, part.pos[2]];
  const wps: Waypoint[] = [];
  let cur = start;
  cur = followCart(wps, cur, hover, open, `${tag} approche`);
  cur = appendPose(wps, cur, poseAt(pick, open), `${tag} descente`, 420);
  cur = appendPose(wps, cur, poseAt(pick, shut), `${tag} prise`, 560);
  appendPose(wps, cur, poseAt(lift, shut), `${tag} extract`, 320);
  return wps;
}

export function inspectPath(parts: WorldPart[], start: Joints = HOME_JOINTS): Waypoint[] {
  const open = 72;
  const wps: Waypoint[] = [wp("Prêt", start, 120)];
  let cur = start;
  for (const p of parts) {
    const hover: Vec3 = [p.pos[0], hoverY(p.pos), p.pos[2]];
    cur = followCart(wps, cur, hover, open, `Cadre ${KIND_META[p.kind].label}`);
  }
  appendPose(wps, cur, HOME_JOINTS, "Home", 200);
  return wps;
}

export function colorSortPath(parts: WorldPart[], start: Joints = HOME_JOINTS): Waypoint[] {
  const queue = parts.filter((p) => !p.held);
  const wps: Waypoint[] = [wp("Prêt", start, 100)];
  let cur = start;
  for (const p of queue) {
    const chunk = pickAndPlace(p.pos, binFor(p.kind), KIND_META[p.kind].label, cur);
    wps.push(...chunk);
    cur = chunk[chunk.length - 1]?.joints ?? cur;
  }
  appendPose(wps, cur, HOME_JOINTS, "Home", 200);
  return wps;
}

export function pickupPath(parts: WorldPart[], start: Joints = HOME_JOINTS): Waypoint[] {
  const pla = parts.find((p) => p.kind === "pla") ?? parts[0];
  if (!pla) return [wp("Home", HOME_JOINTS, 200)];
  const wps = [wp("Prêt", start, 120), ...pickAndPlace(pla.pos, BIN_POS, "Pièce", start)];
  const last = wps[wps.length - 1]?.joints ?? start;
  appendPose(wps, last, HOME_JOINTS, "Home", 180);
  return wps;
}

export function parkPath(start: Joints): Waypoint[] {
  const wps: Waypoint[] = [];
  const tcp = forwardKinematics(start).tcp;
  let cur = start;
  if (inPrinterColumn(tcp)) {
    const above: Vec3 = [tcp[0], hoverY(tcp), tcp[2]];
    cur = appendPose(wps, cur, poseAt(above, start.grip), "Dégage plateau", 280);
  }
  cur = appendPose(wps, cur, { ...VIA_JOINTS, grip: 48 }, "Seuil", 240);
  cur = appendPose(
    wps,
    cur,
    { base: 140, shoulder: 173, elbow: 8, wrist: 8, grip: 40 },
    "Côté",
    280,
  );
  cur = appendPose(
    wps,
    cur,
    { base: 140, shoulder: 175, elbow: 175, wrist: 168, grip: 40 },
    "Repli",
    420,
  );
  appendPose(wps, cur, { ...PARK_JOINTS, grip: 40 }, "Park", 380);
  return wps;
}

export function homePath(start: Joints): Waypoint[] {
  const wps: Waypoint[] = [];
  appendPose(wps, start, { ...HOME_JOINTS, grip: start.grip }, "Home", 280);
  return wps;
}

export function nearestPart(parts: WorldPart[], tcp: Vec3, max = 0.05): WorldPart | null {
  let best: WorldPart | null = null;
  let d = max;
  for (const p of parts) {
    if (p.held) continue;
    const k = Math.hypot(p.pos[0] - tcp[0], p.pos[1] - tcp[1], p.pos[2] - tcp[2]);
    if (k < d) {
      d = k;
      best = p;
    }
  }
  return best;
}

export function grabPoint(fk: Chain): Vec3 {
  return [
    fk.tcp[0] + fk.toolDir[0] * 0.022,
    fk.tcp[1] + fk.toolDir[1] * 0.022,
    fk.tcp[2] + fk.toolDir[2] * 0.022,
  ];
}

export function gotoPath(start: Joints, target: Vec3): Waypoint[] {
  const wps: Waypoint[] = [];
  followCart(wps, start, target, start.grip, "Goto");
  return wps;
}

export function stitchPath(start: Joints, raw: Waypoint[]): Waypoint[] {
  const wps: Waypoint[] = [];
  let cur = start;
  for (const w of raw) {
    cur = appendPose(wps, cur, w.joints, w.label, w.holdMs);
  }
  return wps;
}
