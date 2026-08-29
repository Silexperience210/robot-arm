import { Download, Radio, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOINT_IDS, JOINT_META, type JointId } from "@/lib/arm/types";
import { CAL_DEFAULT } from "@/lib/arm/calibration";
import {
  CAM_FLASH_STEPS,
  ESP32_CAM,
  FLASH_STEPS,
  HEADER_P1,
  HEADER_P2,
  type HeaderPin,
  TDISPLAY,
} from "@/lib/arm/board";
import { CAM_INO, downloadKitZip, downloadPublic, downloadText, FIRMWARE_INO, KIT_STLS, OPENSCAD, PI_BRIDGE, TFT_SETUP } from "@/lib/arm/kit";
import { useArm } from "@/lib/arm/store";
import { cn } from "@/lib/utils";
import { TDisplay } from "./TDisplay";

function CalRow({ id }: { id: JointId }) {
  const cal = useArm((s) => s.calibration[id]);
  const setCalEntry = useArm((s) => s.setCalEntry);
  const meta = JOINT_META[id];
  const def = CAL_DEFAULT[id];
  return (
    <div className="grid grid-cols-[3.4rem_1fr_1fr_1fr] items-center gap-1.5">
      <span className="font-mono text-[10px] text-fg">{meta.short}</span>
      <label className="flex flex-col text-[9px] text-faint">
        home
        <input
          type="number"
          value={cal.home}
          onChange={(e) => setCalEntry(id, { home: Number(e.target.value) || 0 })}
          className="mt-0.5 h-8 w-full rounded bg-surface-2 px-2 font-mono text-[11px] text-fg shadow-[var(--shadow-border)] outline-none"
          aria-label={`${meta.label} home`}
        />
      </label>
      <label className="flex flex-col text-[9px] text-faint">
        repos°
        <input
          type="number"
          value={cal.rest}
          onChange={(e) => setCalEntry(id, { rest: Number(e.target.value) || 0 })}
          className="mt-0.5 h-8 w-full rounded bg-surface-2 px-2 font-mono text-[11px] text-fg shadow-[var(--shadow-border)] outline-none"
          aria-label={`${meta.label} repos`}
        />
      </label>
      <label className="flex flex-col text-[9px] text-faint">
        sens
        <select
          value={cal.dir}
          onChange={(e) => setCalEntry(id, { dir: Number(e.target.value) as 1 | -1 })}
          className="mt-0.5 h-8 w-full rounded bg-surface-2 px-1 font-mono text-[11px] text-fg shadow-[var(--shadow-border)] outline-none"
          aria-label={`${meta.label} sens`}
        >
          <option value={1}>+1</option>
          <option value={-1}>−1</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => setCalEntry(id, { ...def })}
        className="col-span-4 h-6 rounded text-[10px] text-faint hover:text-fg"
        aria-label={`Réinitialiser ${meta.label}`}
      >
        ↺ défaut ({def.home}·{def.rest}·{def.dir > 0 ? "+" : "−"})
      </button>
    </div>
  );
}

function PinList({ title, pins }: { title: string; pins: HeaderPin[] }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-faint">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {pins.map((p, i) => (
          <li
            key={`${p.label}-${i}`}
            className="grid grid-cols-[4.2rem_1fr] items-baseline gap-2 font-mono text-[10px]"
          >
            <span
              className={cn(
                "tabular-nums",
                p.kind === "servo" && "text-accent",
                p.kind === "us" && "text-ok",
                p.kind === "gnd" && "text-muted",
                p.kind === "pwr" && "text-warn",
                p.kind === "free" && "text-fg",
                p.kind === "uart" && "text-faint",
              )}
            >
              {p.label}
            </span>
            <span className="truncate text-muted">{p.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KitPanel() {
  const liveUrl = useArm((s) => s.liveUrl);
  const connected = useArm((s) => s.connected);
  const connecting = useArm((s) => s.connecting);

  return (
    <div className="flex flex-col gap-5 text-sm leading-relaxed text-muted">
      <div className="md:hidden">
        <TDisplay />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Cerveau</p>
        <p className="mt-1 text-fg">{TDISPLAY.name}</p>
        <p className="text-xs">
          {TDISPLAY.pcb} · écran {TDISPLAY.screen.w}×{TDISPLAY.screen.h} {TDISPLAY.screen.driver}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-bg p-3">
        <PinList title="Header P2 · bras" pins={HEADER_P2} />
        <PinList title="Header P1 · libre" pins={HEADER_P1} />
      </div>

      <p className="text-xs">
        GPIO15 est le POWER_ON : le firmware le force à HIGH, sinon l’écran reste noir. GPIO3 est un
        strapping — brancher le servo coude après le boot. Servos sur 5 V 3 A externe, GND commun.
        Ne pas tirer les 5 servos depuis le 5V USB de la carte.
      </p>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Flash</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-fg">
          {FLASH_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" onClick={() => void downloadKitZip()}>
          <Download />
          Kit complet (.zip) — 12 STL + firmware
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadText("pince-tdisplay-s3.ino", FIRMWARE_INO)}
        >
          <Download />
          Firmware T-Display S3
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadText("User_Setup_Select-snippet.h", TFT_SETUP)}
        >
          <Download />
          Setup TFT_eSPI
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadText("pince-esp32-cam.ino", CAM_INO)}
        >
          <Download />
          Firmware ESP32-CAM
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadText("pince-arm.scad", OPENSCAD)}
        >
          <Download />
          OpenSCAD + berceau écran
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadText("pince-pi.py", PI_BRIDGE)}
        >
          <Download />
          Pont Raspberry Pi
        </Button>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">STL · pièce par pièce</p>
        <ul className="mt-2 flex flex-col gap-0.5">
          {KIT_STLS.map((s) => (
            <li key={s.file}>
              <button
                type="button"
                onClick={() => void downloadPublic(`/kit/stl/${s.file}`, s.file)}
                className="flex h-11 w-full items-center gap-2 rounded-md px-2 text-left text-xs hover:bg-surface-2"
              >
                <span className="w-6 shrink-0 font-mono tabular-nums text-accent">×{s.qty}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-fg">{s.file}</span>
                <span className="hidden shrink-0 text-faint sm:inline">{s.note}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Œil · ESP32-CAM</p>
        <p className="mt-1 text-fg">{ESP32_CAM.name}</p>
        <p className="text-xs">{ESP32_CAM.sensor} · {ESP32_CAM.note}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-fg">
          {CAM_FLASH_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Calibration servo ↔ scène</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Le firmware pilote des angles servo bruts (HOME 90·118·48·108·72) ; la scène
          3D travaille en angles géométriques. Cette table fait le pont — ajuste
          <span className="text-fg"> home / repos / sens</span> une fois, après le calage
          des cornes.
        </p>
        <div className="mt-2 flex flex-col gap-1">
          {JOINT_IDS.map((id) => (
            <CalRow key={id} id={id} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Lien carte</p>
        <p className="mt-1 text-xs">
          Téléphone sur le Wi-Fi <span className="text-fg">{TDISPLAY.apSsid}</span> ({TDISPLAY.apPass}),
          puis connecte. BTN2 (côté carte) = home, appui long = stop.
        </p>
        <input
          value={liveUrl}
          onChange={(e) => useArm.getState().setLiveUrl(e.target.value)}
          className="mt-2 h-11 w-full rounded-md bg-surface-2 px-3 font-mono text-xs text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label="URL WebSocket T-Display S3"
        />
        <div className="mt-2 flex gap-2">
          {connected ? (
            <Button type="button" variant="outline" onClick={() => useArm.getState().disconnectLive()}>
              <Unplug />
              Couper
            </Button>
          ) : (
            <Button type="button" onClick={() => useArm.getState().connectLive()} disabled={connecting}>
              <Radio />
              {connecting ? "Connexion…" : "Lier le LilyGO"}
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs">
          {connected
            ? "T-Display S3 lié — les poses partent sur la carte."
            : "Simulateur — l’écran ci-contre mime le 170×320."}
        </p>
      </div>
    </div>
  );
}