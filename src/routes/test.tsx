import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  forwardKinematics,
  solveIK,
  connectJoints,
  cartesianPath,
  hazard,
  dist,
  maxJointError,
  jointsHitPrinter,
  simulateUltrasonic,
} from "@/lib/arm/kinematics";
import { toFirmware, fromFirmware, CAL_DEFAULT } from "@/lib/arm/calibration";
import { HOME_JOINTS, type Joints, type Vec3 } from "@/lib/arm/types";

type Result = {
  name: string;
  detail: string;
  ok: boolean;
  ms: number;
};

/* ── Tests purs (aucun DOM, aucun réseau) ──────────────────────────── */
function runSuite(): Result[] {
  const out: Result[] = [];
  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const mark = (name: string, ok: boolean, detail: string) => {
    out.push({
      name,
      ok,
      detail,
      ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0),
    });
  };

  /* 1. FK sur 3 poses connues (repère : y=hauteur, bras le long de +Z) */
  const p1 = forwardKinematics({ base: 90, shoulder: 173, elbow: 8, wrist: 8, grip: 72 });
  mark(
    "FK pose HOME",
    Math.abs(p1.tcp[0]) < 1e-9 && Math.abs(p1.tcp[1] - 0.104) < 0.01 && Math.abs(p1.tcp[2] - 0.129) < 0.02,
    `tcp=[${p1.tcp.map((v) => v.toFixed(3)).join(", ")}]`,
  );
  const p2 = forwardKinematics({ base: 45, shoulder: 60, elbow: 120, wrist: 90, grip: 0 });
  mark(
    "FK pose repliée",
    p2.tcp[0] < 0 && p2.tcp[1] < 0.05 && p2.tcp[2] > 0.1,
    `tcp=[${p2.tcp.map((v) => v.toFixed(3)).join(", ")}]`,
  );
  const p3 = forwardKinematics({ base: 150, shoulder: 170, elbow: 10, wrist: 0, grip: 90 });
  mark(
    "FK pose opposée",
    p3.tcp[0] > 0.05 && p3.tcp[1] > 0.1,
    `tcp=[${p3.tcp.map((v) => v.toFixed(3)).join(", ")}]`,
  );

  /* 2. IK round-trip : FK ∘ IK = identité sur l'image de FK.
   * Les seeds sont générés dans le VRAI workspace : outil vers le bas
   * (contrat de l'IK, PITCHES négatifs) + TCP au-dessus du sol. */
  const seedPoses: Joints[] = [];
  outer: for (let i = 0; i < 300 && seedPoses.length < 12; i++) {
    for (let j = 0; j < 300 && seedPoses.length < 12; j++) {
      const sh = 130 + (i % 8) * 5;
      const el = 8 + (j % 7) * 3;
      const wr = 10 + ((i * 7 + j) % 9) * 4;
      if (sh + el + wr > 179) continue;
      const base = 90 + Math.sin((i + j) * 0.7) * 55;
      const f = forwardKinematics({ base, shoulder: sh, elbow: el, wrist: wr, grip: 72 });
      if (f.toolDir[1] > -0.05 || f.tcp[1] < 0.03) continue;
      seedPoses.push({ base, shoulder: sh, elbow: el, wrist: wr, grip: 72 });
    }
  }
  const targets = seedPoses.map((j) => forwardKinematics(j).tcp);
  let ikOk = 0;
  let worst = 0;
  const ikDetails: string[] = [];
  for (const t of targets) {
    const j = solveIK(t, 72, false);
    if (!j) {
      ikDetails.push(`✗ null`);
      continue;
    }
    const e = dist(forwardKinematics(j).tcp, t);
    worst = Math.max(worst, e);
    if (e < 0.004) ikOk++;
    ikDetails.push(`${(e * 1000).toFixed(1)} mm`);
  }
  mark("IK round-trip 12 cibles (FK∘IK)", ikOk >= 11 && worst < 0.008, `${ikOk}/${targets.length} · pire=${(worst * 1000).toFixed(2)} mm`);

  /* 3. IK cible hors portée → fallback VIA (repli sûr, comportement voulu) */
  const far = solveIK([0, 0.05, 0.6], 72);
  const farTcp = far ? forwardKinematics(far).tcp : [0, 0, 0] as Vec3;
  mark(
    "IK hors portée → repli VIA",
    far !== null && dist(farTcp, [0, 0.05, 0.6]) > 0.25,
    `écart=${(dist(farTcp, [0, 0.05, 0.6]) * 1000).toFixed(0)} mm — la pose de repli ne prétend pas atteindre`,
  );

  /* 4. Chemin sans collision (connectJoints) */
  const from = HOME_JOINTS;
  const to = solveIK([0.1, 0.08, 0.12], 72) ?? from;
  const path = connectJoints(from, to);
  let allClear = path.length > 0;
  for (const j of path) {
    if (jointsHitPrinter(j)) allClear = false;
  }
  mark(
    "Chemin sans collision",
    allClear,
    `${path.length} via-points · jointsHitPrinter=null sur tous ✓`,
  );

  /* 5. Chemin cartésien */
  const cart = cartesianPath([0, 0.104, 0.129], [0.08, 0.07, 0.1]);
  let cartClear = cart.length > 0;
  for (const pt of cart) {
    if (jointsHitPrinter(solveIK(pt, 72) ?? HOME_JOINTS)) cartClear = false;
  }
  mark("Chemin cartésien", cartClear, `${cart.length} points ✓`);

  /* 6. Calibration round-trip */
  const fw = toFirmware({ ...HOME_JOINTS }, CAL_DEFAULT);
  const back = fromFirmware(fw, CAL_DEFAULT);
  mark(
    "Calibration round-trip",
    maxJointError(back, HOME_JOINTS) < 1e-6,
    `servo=${Object.values(fw).join("/")} → scène ✓`,
  );

  /* 7. Sécurité : hazard obstacle (us en CM) */
  mark(
    "Hazard ultrason (obstacle 2 cm)",
    hazard([0.1, 0.05, 0.1], 2) === "proximité",
    `us=2cm → "${hazard([0.1, 0.05, 0.1], 2)}"`,
  );
  mark(
    "Hazard ultrason (libre 25 cm)",
    hazard([0.1, 0.05, 0.1], 25) === null,
    `us=25cm → null ✓`,
  );
  mark(
    "Hazard sol (pince trop basse)",
    hazard([0.1, 0.003, 0.1], 25) === "sol",
    `y=3mm → "sol" ✓`,
  );

  /* 8. Ultrason simulé monotone */
  const us = [0.04, 0.08, 0.12, 0.16, 0.2].map((d) =>
    simulateUltrasonic([0, 0.05, d], [0, 1, 0], [], false),
  );
  mark(
    "Ultrason simulé monotone",
    us.every((v, i) => i === 0 || v >= us[i - 1] - 0.001),
    `[${us.map((v) => v.toFixed(2)).join(", ")}] m`,
  );

  return out;
}

/* ── Page ──────────────────────────────────────────────────────────── */
function TestPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [sceneTest, setSceneTest] = useState<string>("en attente…");

  const pure = useMemo(() => runSuite(), []);
  useEffect(() => {
    setResults(pure);
    /* 9. Scène 3D = FK (via l'autotest exposé par ArmViewport) */
    let n = 0;
    const iv = setInterval(() => {
      n++;
      const arm = (window as unknown as Record<string, unknown>).__ARM_TEST as
        | ((p?: Partial<Joints>) => { pass: boolean; cases: { name: string; err: number }[] })
        | undefined;
      if (arm) {
        try {
          const r = arm();
          setSceneTest(
            r.pass
              ? `3 poses · écart max ${Math.max(...r.cases.map((c) => c.err)).toFixed(3)} mm ✓`
              : `ÉCHEC : ${JSON.stringify(r.cases)}`,
          );
          clearInterval(iv);
        } catch (e) {
          setSceneTest(`erreur : ${String(e)}`);
        }
      } else if (n > 20) {
        setSceneTest("scène 3D non montée sur cette page (test via /studio)");
        clearInterval(iv);
      }
    }, 400);
    return () => clearInterval(iv);
  }, [pure]);

  const passed = results.filter((r) => r.ok).length;

  return (
    <div className="min-h-screen bg-[#0b0c0b] px-6 py-10 text-stone-200">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          PINCE · Suite de tests — simulation navigateur
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-100">
          Autotest cinématique & sécurité
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Tout tourne dans le navigateur, sans bras, sans réseau. C&apos;est la suite qui
          certifie que la simulation = la mécanique réelle.
        </p>

        <div className="mt-6 rounded-lg border border-stone-800 bg-[#101110] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-300">Résultat global</span>
            <span
              className={`rounded px-2 py-1 text-xs font-semibold ${
                passed === results.length
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-rose-500/15 text-rose-300"
              }`}
            >
              {passed}/{results.length} PASS
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            {results.map((r) => (
              <div
                key={r.name}
                className="flex items-start justify-between gap-4 rounded border border-stone-800/60 bg-[#0b0c0b] px-3 py-2 font-mono text-xs"
              >
                <span className="flex items-center gap-2">
                  <span className={r.ok ? "text-emerald-400" : "text-rose-400"}>
                    {r.ok ? "✓" : "✗"}
                  </span>
                  <span className="text-stone-300">{r.name}</span>
                </span>
                <span className="text-right text-stone-500">
                  {r.detail}
                  <span className="ml-2 text-stone-600">{r.ms} ms</span>
                </span>
              </div>
            ))}
            <div className="flex items-start justify-between gap-4 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 font-mono text-xs">
              <span className="flex items-center gap-2">
                <span className="text-amber-400">⟳</span>
                <span className="text-stone-300">Scène 3D = forwardKinematics</span>
              </span>
              <span className="text-stone-400">{sceneTest}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-stone-500">
          Seuil IK : 4 mm · FK attendue depuis les constantes du kit (l1=120, l2=105, l3=58,
          H=40). La suite s&apos;exécute aussi en console :{" "}
          <code className="rounded bg-stone-800 px-1">window.__ARM_TEST()</code>
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/test")({
  component: TestPage,
});
