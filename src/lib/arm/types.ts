export const JOINT_IDS = ["base", "shoulder", "elbow", "wrist", "grip"] as const;
export type JointId = (typeof JOINT_IDS)[number];

export type Joints = Record<JointId, number>;

export const JOINT_META: Record<
  JointId,
  { label: string; short: string; min: number; max: number; unit: string }
> = {
  base: { label: "Base", short: "Base", min: 0, max: 180, unit: "°" },
  shoulder: { label: "Épaule", short: "Épau.", min: 0, max: 180, unit: "°" },
  elbow: { label: "Coude", short: "Coude", min: 0, max: 180, unit: "°" },
  wrist: { label: "Poignet", short: "Poig.", min: 0, max: 180, unit: "°" },
  grip: { label: "Pince", short: "Pince", min: 0, max: 90, unit: "°" },
};

/** Ready pose in front of the printer (extended, below the gantry). */
export const HOME_JOINTS: Joints = {
  base: 90,
  shoulder: 173,
  elbow: 8,
  wrist: 8,
  grip: 72,
};

export const ARM_DIM = {
  baseHeight: 0.04,
  l1: 0.12,
  l2: 0.105,
  l3: 0.058,
  jawLength: 0.038,
};

export type Vec3 = [number, number, number];

export type Waypoint = {
  id: string;
  label: string;
  joints: Joints;
  holdMs: number;
};

export type Mission = {
  id: string;
  title: string;
  blurb: string;
  waypoints: Waypoint[];
};

export const PART_KINDS = ["pla", "petg", "fail"] as const;
export type PartKind = (typeof PART_KINDS)[number];

export type WorldPart = {
  id: string;
  kind: PartKind;
  pos: Vec3;
  home: Vec3;
  held: boolean;
};

export const KIND_META: Record<
  PartKind,
  { label: string; color: string; accent: string; bin: "L" | "R" }
> = {
  pla: { label: "PLA", color: "#d9d0bf", accent: "#c5cbb8", bin: "L" },
  petg: { label: "PETG", color: "#3d4452", accent: "#5a6478", bin: "R" },
  fail: { label: "REJET", color: "#c47a6a", accent: "#a85c50", bin: "L" },
};

export type VoiceCommand =
  | { kind: "nudge"; joint: JointId; delta: number }
  | { kind: "set"; joint: JointId; value: number }
  | { kind: "cartesian"; axis: "x" | "y" | "z"; delta: number }
  | { kind: "stop" }
  | { kind: "speed"; value: number }
  | { kind: "mission"; id: string }
  | { kind: "home" }
  | { kind: "record" }
  | { kind: "play" }
  | { kind: "clear" }
  | { kind: "help" }
  | { kind: "eye" }
  | { kind: "look" }
  | { kind: "reset" }
  | { kind: "goto"; place: "bed" | "binL" | "binR" }
  | { kind: "grab" }
  | { kind: "ai"; text: string };

export type LogKind = "voice" | "mission" | "system" | "ai";

export type LogEntry = {
  id: string;
  at: number;
  kind: LogKind;
  text: string;
};

export const PRINTER = {
  origin: [0.015, 0, 0.205] as Vec3,
  bedY: 0.074,
  bedSize: 0.12,
};

export const BIN_POS: Vec3 = [-0.15, 0.012, 0.11];
export const BIN_RIGHT: Vec3 = [0.16, 0.012, 0.11];

export type JogMode = "joint" | "cart";
export type JogStep = 2 | 8 | 20;
