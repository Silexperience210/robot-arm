import { Play, Plus, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArm } from "@/lib/arm/store";

export function SequencePanel() {
  const sequence = useArm((s) => s.sequence);
  const playMode = useArm((s) => s.playMode);
  const playIndex = useArm((s) => s.playIndex);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => useArm.getState().recordWaypoint()}>
          <Plus />
          Capturer
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => useArm.getState().playSequence()}
          disabled={!sequence.length}
        >
          <Play />
          Jouer
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => useArm.getState().stop()}>
          <Square />
          Stop
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => useArm.getState().clearSequence()}
          disabled={!sequence.length}
        >
          <Trash2 />
          Vider
        </Button>
      </div>
      {sequence.length === 0 ? (
        <p className="text-sm text-muted">
          Place le bras, puis capture. Ou dis « enregistre » au micro.
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {sequence.map((wp, i) => (
            <li
              key={wp.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                playMode === "sequence" && playIndex === i ? "bg-surface-2" : "bg-bg"
              }`}
            >
              <span className="font-medium">{wp.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted">
                {Math.round(wp.joints.base)}/{Math.round(wp.joints.shoulder)}/
                {Math.round(wp.joints.elbow)}
              </span>
              <button
                type="button"
                className="grid size-9 place-items-center text-muted hover:text-fg"
                aria-label="Supprimer"
                onClick={() => useArm.getState().removeWaypoint(wp.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
