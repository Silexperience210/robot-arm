import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MISSIONS } from "@/lib/arm/missions";
import { useArm } from "@/lib/arm/store";
import { cn } from "@/lib/utils";
import { PartLegend } from "./Pendant";

export function MissionPanel() {
  const missionId = useArm((s) => s.missionId);
  const playMode = useArm((s) => s.playMode);
  const playIndex = useArm((s) => s.playIndex);
  const active = useArm((s) => s.activeWaypoints);

  return (
    <div className="flex flex-col gap-2">
      {MISSIONS.map((m) => {
        const on = playMode === "mission" && missionId === m.id;
        const total = on && active.length ? active.length : m.waypoints.length;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => useArm.getState().playMission(m.id)}
            className={cn(
              "rounded-lg p-3 text-left shadow-[var(--shadow-border)] transition-colors duration-[var(--motion-quick)]",
              on ? "bg-surface-2" : "bg-surface hover:bg-surface-2",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-fg">{m.title}</p>
              <Play className="size-3.5 text-muted" />
            </div>
            <p className="mt-1 text-xs leading-snug text-muted">{m.blurb}</p>
            {on ? (
              <p className="mt-2 font-mono text-[11px] tabular-nums text-ok">
                {playIndex + 1}/{total} · {active[playIndex]?.label}
              </p>
            ) : null}
          </button>
        );
      })}
      <div className="mt-2">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-faint">Objets</p>
        <PartLegend />
      </div>
      <Button type="button" variant="outline" onClick={() => useArm.getState().goHome()}>
        Home
      </Button>
      <Button type="button" variant="outline" onClick={() => useArm.getState().grabNearest()}>
        Attraper
      </Button>
      <Button type="button" variant="ghost" onClick={() => useArm.getState().resetPart()}>
        Reposer l'atelier
      </Button>
      <Button type="button" variant="ghost" onClick={() => useArm.getState().stop()}>
        Stop
      </Button>
    </div>
  );
}