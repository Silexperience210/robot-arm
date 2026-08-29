import type { JointId, Joints } from "./types";

/**
 * Table de calibration servo ↔ géométrie.
 *
 * Le firmware (pince-tdisplay-s3.ino) pilote les servos avec des angles
 * 0–180 bruts, cornes vissées dans la pose HOME = {90, 118, 48, 108, 72}.
 * La scène 3D de ce studio travaille dans sa propre convention géométrique
 * (base 90 = neutre, épaule 90 = bras horizontal…).
 *
 * geo = (servo − home) · dir + rest
 * servo = (geo − rest) / dir + home
 *
 * Les valeurs `rest` sont les angles géométriques correspondant au HOME
 * mécanique du firmware. Elles sont à ajuster une fois (à l'assemblage)
 * puis exportées — c'est le même principe que le calage des cornes.
 */
export type CalEntry = { home: number; rest: number; dir: 1 | -1 };

export const CAL_DEFAULT: Record<JointId, CalEntry> = {
  base:     { home: 90,  rest: 90,  dir: 1 },
  shoulder: { home: 118, rest: 173, dir: -1 },
  elbow:    { home: 48,  rest: 8,   dir: -1 },
  wrist:    { home: 108, rest: 8,   dir: -1 },
  grip:     { home: 72,  rest: 72,  dir: 1 },
};

/** Angles scène 3D → angles servo firmware (à envoyer au bras). */
export function toFirmware(j: Joints, cal: Record<JointId, CalEntry> = CAL_DEFAULT): Joints {
  const out = {} as Joints;
  for (const k of Object.keys(j) as JointId[]) {
    const c = cal[k];
    out[k] = Math.min(180, Math.max(0, (j[k] - c.rest) / c.dir + c.home));
  }
  return out;
}

/** Angles servo firmware (lus sur `state`) → angles scène 3D. */
export function fromFirmware(j: Joints, cal: Record<JointId, CalEntry> = CAL_DEFAULT): Joints {
  const out = {} as Joints;
  for (const k of Object.keys(j) as JointId[]) {
    const c = cal[k];
    out[k] = (j[k] - c.home) * c.dir + c.rest;
  }
  return out;
}
