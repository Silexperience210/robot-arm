import { useEffect, useState } from "react";
import { KIND_META } from "@/lib/arm/types";
import { useArm, visual } from "@/lib/arm/store";
import { cn } from "@/lib/utils";

const STEPS = [2, 8, 20] as const;

function HoldBtn({ label, onTick, className }: { label: string; onTick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid h-11 min-w-11 place-items-center rounded-md bg-surface-2 font-mono text-xs text-fg shadow-[var(--shadow-border)] active:scale-[0.96]",
        className,
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        onTick();
        const id = window.setInterval(onTick, 90);
        const stop = () => {
          window.clearInterval(id);
          window.removeEventListener("pointerup", stop);
        };
        window.addEventListener("pointerup", stop);
      }}
    >
      {label}
    </button>
  );
}

export function JogPad() {
  const mode = useArm((s) => s.jogMode);
  const step = useArm((s) => s.jogStep);
  const arm = () => useArm.getState();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        {(["cart", "joint"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => arm().setJogMode(m)}
            className={cn(
              "h-9 flex-1 rounded-full text-xs font-medium",
              mode === m ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
            )}
          >
            {m === "cart" ? "XYZ" : "Axes"}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {STEPS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => arm().setJogStep(n)}
            className={cn(
              "h-9 flex-1 rounded-full font-mono text-xs",
              step === n ? "bg-surface-2 text-fg" : "text-muted",
            )}
          >
            {n}
            {mode === "cart" ? " mm" : "°"}
          </button>
        ))}
      </div>
      {mode === "cart" ? (
        <div className="grid grid-cols-3 gap-1.5">
          <span />
          <HoldBtn label="Z+" onTick={() => arm().jogCart("z", 1)} />
          <HoldBtn label="Y+" onTick={() => arm().jogCart("y", 1)} />
          <HoldBtn label="X−" onTick={() => arm().jogCart("x", -1)} />
          <HoldBtn label="⌂" onTick={() => arm().goHome()} />
          <HoldBtn label="X+" onTick={() => arm().jogCart("x", 1)} />
          <span />
          <HoldBtn label="Z−" onTick={() => arm().jogCart("z", -1)} />
          <HoldBtn label="Y−" onTick={() => arm().jogCart("y", -1)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <HoldBtn label="Base −" onTick={() => arm().nudge("base", -step)} />
          <HoldBtn label="Base +" onTick={() => arm().nudge("base", step)} />
          <HoldBtn label="Épau. −" onTick={() => arm().nudge("shoulder", -step)} />
          <HoldBtn label="Épau. +" onTick={() => arm().nudge("shoulder", step)} />
          <HoldBtn label="Coude −" onTick={() => arm().nudge("elbow", -step)} />
          <HoldBtn label="Coude +" onTick={() => arm().nudge("elbow", step)} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <HoldBtn label="Ouvre" onTick={() => arm().nudge("grip", 6)} />
        <HoldBtn label="Ferme" onTick={() => arm().nudge("grip", -6)} />
      </div>
      <button
        type="button"
        className="h-11 rounded-md bg-accent text-xs font-medium text-accent-fg"
        onClick={() => arm().grabNearest()}
      >
        Attraper
      </button>
    </div>
  );
}

export function TcpHud() {
  const [snap, setSnap] = useState({ x: 0, y: 0, z: 0, r: 55, h: null as string | null, n: 3 });
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = visual.tcp;
      setSnap({
        x: t[0] * 1000,
        y: t[1] * 1000,
        z: t[2] * 1000,
        r: Math.round(visual.reach * 100),
        h: visual.hazard,
        n: visual.parts.filter((p) => !p.held).length,
      });
    }, 80);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-none rounded-md bg-bg/80 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-muted">
      <p>
        TCP {snap.x.toFixed(0).padStart(4)} {snap.y.toFixed(0).padStart(4)} {snap.z.toFixed(0).padStart(4)} mm
      </p>
      <p>
        <span className={snap.h ? "text-danger" : "text-ok"}>{snap.h ? snap.h.toUpperCase() : "SAFE"}</span>
        {"  "}
        <span>REACH {snap.r}%</span>
        {"  "}
        <span>{snap.n} obj</span>
      </p>
    </div>
  );
}

export function PartLegend() {
  return (
    <ul className="flex flex-col gap-1 text-xs text-muted">
      {visual.parts.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-surface-2"
            onClick={() => {
              useArm.getState().grabPart(p.id);
            }}
          >
            <span className="size-2.5 rounded-full" style={{ background: KIND_META[p.kind].color }} />
            {KIND_META[p.kind].label}
            <span className="ml-auto font-mono text-[10px] text-faint">
              bac {KIND_META[p.kind].bin}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}