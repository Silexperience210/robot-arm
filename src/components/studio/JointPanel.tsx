import { Minus, Plus } from "lucide-react";
import { useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { SERVO_PINS } from "@/lib/arm/board";
import { JOINT_IDS, JOINT_META, type JointId } from "@/lib/arm/types";
import { useArm } from "@/lib/arm/store";

function Hold({ onTick, label }: { onTick: () => void; label: string }) {
  const id = useRef<number | null>(null);
  const start = () => {
    onTick();
    id.current = window.setInterval(onTick, 85);
  };
  const stop = () => {
    if (id.current != null) window.clearInterval(id.current);
    id.current = null;
  };
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-md bg-surface-2 text-fg shadow-[var(--shadow-border)] active:scale-[0.96]"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {label.includes("plus") ? <Plus className="size-4" /> : <Minus className="size-4" />}
    </button>
  );
}

function Row({ id }: { id: JointId }) {
  const value = useArm((s) => s.target[id]);
  const meta = JOINT_META[id];
  return (
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[4.5rem_1fr_auto]">
      <div className="flex items-baseline justify-between sm:block">
        <p className="text-xs font-medium text-fg">{meta.label}</p>
        <p className="font-mono text-[11px] tabular-nums text-muted">
          {Math.round(value)}
          {meta.unit}
          <span className="ml-1 text-faint">G{SERVO_PINS[id]}</span>
        </p>
      </div>
      <Slider
        min={meta.min}
        max={meta.max}
        step={1}
        value={[value]}
        onValueChange={([v]) => useArm.getState().setJoint(id, v ?? value)}
      />
      <div className="flex justify-end gap-1">
        <Hold label={`${meta.label} moins`} onTick={() => useArm.getState().nudge(id, -4)} />
        <Hold label={`${meta.label} plus`} onTick={() => useArm.getState().nudge(id, 4)} />
      </div>
    </div>
  );
}

export function JointPanel() {
  const speed = useArm((s) => s.speed);
  return (
    <div className="flex flex-col gap-4">
      {JOINT_IDS.map((id) => (
        <Row key={id} id={id} />
      ))}
      <div className="grid grid-cols-[4.5rem_1fr] items-center gap-2 pt-1">
        <p className="text-xs font-medium text-fg">Vitesse</p>
        <Slider
          min={0.2}
          max={1}
          step={0.02}
          value={[speed]}
          onValueChange={([v]) => useArm.getState().setSpeed(v ?? speed)}
        />
      </div>
    </div>
  );
}
