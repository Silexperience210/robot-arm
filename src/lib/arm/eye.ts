import { PRINTER, type Vec3 } from "./types";

/** Vue de l’ESP32-CAM : plongée sur le plateau, accrochée au portique. */
export function worldToCam(p: Vec3): { x: number; y: number; visible: boolean } {
  const o = PRINTER.origin;
  const s = PRINTER.bedSize * 1.15;
  const x = 0.5 + (p[0] - o[0]) / s;
  const y = 0.5 + (p[2] - o[2]) / s;
  return {
    x,
    y,
    visible: x > -0.08 && x < 1.08 && y > -0.08 && y < 1.08 && p[1] < 0.24,
  };
}

export const CAM = {
  name: "ESP32-CAM AI-Thinker",
  sensor: "OV2640",
  stream: "http://192.168.4.2:81/stream",
  still: "http://192.168.4.2/capture",
  apJoin: "PINCE",
  flashGpio: 4,
} as const;
