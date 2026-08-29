import { useEffect, useState } from "react";
import { HOME_JOINTS, JOINT_IDS, JOINT_META, type Joints } from "@/lib/arm/types";
import { SERVO_PINS, TDISPLAY } from "@/lib/arm/board";
import { useArm, visual } from "@/lib/arm/store";
import { cn } from "@/lib/utils";

export function TDisplay({ compact = false }: { compact?: boolean }) {
  const [pose, setPose] = useState<Joints>({ ...HOME_JOINTS });
  const us = useArm((s) => s.ultrasonic);
  const batt = useArm((s) => s.batteryV);
  const connected = useArm((s) => s.connected);
  const playMode = useArm((s) => s.playMode);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPose({ ...visual.current });
    }, 90);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={cn("shrink-0", compact ? "w-[196px]" : "w-[220px] sm:w-[248px]")}>
      <div className="rounded-xl bg-[#16180f] p-1.5 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-[9px] font-medium tracking-[0.16em] text-faint">LILYGO</span>
          <span className="text-[9px] text-faint">T-DISPLAY S3</span>
        </div>
        <div
          className="relative overflow-hidden rounded-sm bg-bg px-2 py-1.5 font-mono"
          style={{ aspectRatio: "320 / 170" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium tracking-wide text-accent">PINCE</span>
            <span className="text-[9px] tabular-nums text-ok">{batt.toFixed(2)}V</span>
          </div>
          <div className="mt-1 flex flex-col gap-[3px]">
            {JOINT_IDS.map((id) => {
              const max = JOINT_META[id].max;
              const v = pose[id];
              return (
                <div key={id} className="flex items-center gap-1.5">
                  <span className="w-8 text-[8px] uppercase tracking-wide text-faint">
                    {JOINT_META[id].short}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(v / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[8px] tabular-nums text-fg">
                    {Math.round(v)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[8px] text-faint">
            <span className="tabular-nums">US {us.toFixed(1)} cm</span>
            <span className={cn(connected ? "text-ok" : "text-faint")}>
              {connected ? "WS ON" : "AP PINCE"}
            </span>
            <span>{playMode === "idle" ? "BTN2 home" : "RUN"}</span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <button
            type="button"
            className="h-6 rounded-full bg-surface-2 px-2 text-[9px] text-muted"
            onClick={() => useArm.getState().playMission("wave")}
          >
            BOOT
          </button>
          <p className="text-[8px] text-faint">GPIO14</p>
          <button
            type="button"
            className="h-6 rounded-full bg-accent px-2 text-[9px] font-medium text-accent-fg"
            onClick={() => useArm.getState().goHome()}
          >
            BTN2
          </button>
        </div>
      </div>
      {compact ? null : (
        <>
          <p className="mt-1 text-center text-[10px] text-faint">
            Clone 170×320 · {TDISPLAY.apSsid} / {TDISPLAY.apPass}
          </p>
          <p className="mt-0.5 hidden text-center font-mono text-[9px] text-faint sm:block">
            {JOINT_IDS.map((id) => `${id[0]}:${SERVO_PINS[id]}`).join("  ")}
          </p>
        </>
      )}
    </div>
  );
}
