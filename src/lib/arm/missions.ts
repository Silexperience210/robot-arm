import { inverseKinematics, PARK_JOINTS } from "./kinematics";
import { colorSortPath, inspectPath, parkPath, pickupPath, stitchPath } from "./parts";
import { HOME_JOINTS, PRINTER, type Joints, type Mission, type Waypoint, type WorldPart } from "./types";

let n = 0;
function w(label: string, joints: Joints, holdMs = 280): Waypoint {
  n += 1;
  return { id: `w${n}`, label, joints: { ...joints }, holdMs };
}

const aboveBed =
  inverseKinematics([PRINTER.origin[0], PRINTER.bedY + 0.055, PRINTER.origin[2] + 0.01], 78) ??
  HOME_JOINTS;
const onBed =
  inverseKinematics([PRINTER.origin[0], PRINTER.bedY + 0.02, PRINTER.origin[2] + 0.01], 78) ??
  HOME_JOINTS;
const pinchBed = { ...onBed, grip: 8 };

export const MISSIONS: Mission[] = [
  {
    id: "pickup",
    title: "Fin d'impression",
    blurb: "Sort du cadre, prend la pièce PLA, dépose dans le bac gauche.",
    waypoints: [w("Repos", HOME_JOINTS, 200)],
  },
  {
    id: "color",
    title: "Triage couleur",
    blurb: "PLA → gauche, PETG → droite, rejet au sol → gauche. Contourne le cadre.",
    waypoints: [w("Home", HOME_JOINTS, 180)],
  },
  {
    id: "inspect",
    title: "Inspection",
    blurb: "Survole chaque objet sans rentrer dans le portique.",
    waypoints: [w("Home", HOME_JOINTS, 180)],
  },
  {
    id: "hold",
    title: "Maintien",
    blurb: "Ferme la pince et fige le bras pour tenir une pièce.",
    waypoints: [
      w("Approche", aboveBed, 300),
      w("Contact", onBed, 360),
      w("Maintien", { ...pinchBed, grip: 12 }, 0),
    ],
  },
  {
    id: "scan",
    title: "Balayage ultrason",
    blurb: "Balaye devant le plateau — jamais dans les montants.",
    waypoints: [
      w("Gauche", inverseKinematics([-0.1, 0.11, 0.12], 70) ?? HOME_JOINTS, 240),
      w("Seuil", inverseKinematics([0.02, 0.11, 0.12], 70) ?? HOME_JOINTS, 240),
      w("Droite", inverseKinematics([0.1, 0.11, 0.12], 70) ?? HOME_JOINTS, 240),
      w("Home", HOME_JOINTS, 200),
    ],
  },
  {
    id: "wave",
    title: "Salut",
    blurb: "Séquence de démo — vérifie les cinq servos, hors du volume d'impression.",
    waypoints: [
      w("Home", HOME_JOINTS, 200),
      w("Coucou 1", { base: 128, shoulder: 173, elbow: 8, wrist: 8, grip: 82 }, 280),
      w("Coucou 2", { base: 128, shoulder: 173, elbow: 8, wrist: 42, grip: 16 }, 280),
      w("Coucou 3", { base: 128, shoulder: 173, elbow: 8, wrist: 8, grip: 82 }, 280),
      w("Ouvert", { ...HOME_JOINTS, grip: 88 }, 200),
      w("Home", HOME_JOINTS, 200),
    ],
  },
  {
    id: "park",
    title: "Parking",
    blurb: "Dégage le plateau, se replie derrière la base — hors du cadre, au maximum.",
    waypoints: [w("Park", PARK_JOINTS, 500)],
  },
];

export function missionById(id: string) {
  return MISSIONS.find((m) => m.id === id) ?? null;
}

export function waypointsFor(id: string, parts: WorldPart[], start: Joints): Waypoint[] {
  if (id === "color") return colorSortPath(parts, start);
  if (id === "inspect") return inspectPath(parts, start);
  if (id === "pickup") return pickupPath(parts, start);
  if (id === "park") return parkPath(start);
  const raw = missionById(id)?.waypoints ?? [];
  return stitchPath(start, raw);
}
