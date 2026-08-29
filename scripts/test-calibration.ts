// Test de la table de calibration : round-trip + bornes.
// Exécution : npx tsx scripts/test-calibration.ts
import { toFirmware, fromFirmware, CAL_DEFAULT } from "../src/lib/arm/calibration";
import { HOME_JOINTS, type Joints } from "../src/lib/arm/types";

let fails = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) fails++;
}

// 1. Le HOME de la scène doit mapper sur le HOME du firmware.
const fw = toFirmware(HOME_JOINTS);
check("HOME scène → HOME firmware", JSON.stringify(fw) === JSON.stringify({ base: 90, shoulder: 118, elbow: 48, wrist: 108, grip: 72 }), JSON.stringify(fw));

// 2. Round-trip : firmware → scène → firmware = identité.
const sceneHome = fromFirmware(fw);
check("round-trip FW→scène = HOME scène", JSON.stringify(sceneHome) === JSON.stringify(HOME_JOINTS), JSON.stringify(sceneHome));

// 3. Bornes : jamais hors [0, 180] (grip [0, 90]).
const extreme: Joints = { base: 0, shoulder: 180, elbow: 0, wrist: 180, grip: 0 };
const fwExt = toFirmware(extreme);
const bounded = Object.entries(fwExt).every(([k, v]) =>
  k === "grip" ? v >= 0 && v <= 90 : v >= 0 && v <= 180
);
check("bornes respectées", bounded, JSON.stringify(fwExt));

// 4. Direction : épaule 173 (scène) = 118 (servo) via dir=-1.
const solo = toFirmware({ ...HOME_JOINTS, shoulder: 173 });
check("épaule 173 → servo 118", solo.shoulder === 118, String(solo.shoulder));

// 5. Calibration inversée (dir flippé) doit être réversible.
const flip = { ...CAL_DEFAULT, shoulder: { ...CAL_DEFAULT.shoulder, dir: 1 as const } };
const a = toFirmware({ ...HOME_JOINTS, shoulder: 100 }, flip);
const b = fromFirmware(a, flip);
check("round-trip avec dir inversé", Math.abs(b.shoulder - 100) < 0.01, JSON.stringify(a));

console.log(fails === 0 ? "\nTOUS LES TESTS PASSENT" : `\n${fails} ÉCHEC(S)`);
process.exit(fails === 0 ? 0 : 1);
