import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArm } from "@/lib/arm/store";
import { parseVoice, VOICE_EXAMPLES } from "@/lib/arm/voice";
import { cn } from "@/lib/utils";
import { useVoice } from "./useVoice";

const QUICK = ["trie par couleur", "enlève la pièce", "inspecte", "ouvre la pince", "va au plateau", "stop"];

export function VoiceDock() {
  const { toggle, runAi } = useVoice();
  const listening = useArm((s) => s.listening);
  const transcript = useArm((s) => s.transcript);
  const lastCommand = useArm((s) => s.lastCommand);
  const lastHeard = useArm((s) => s.lastHeard);
  const aiBusy = useArm((s) => s.aiBusy);
  const helpOpen = useArm((s) => s.helpOpen);

  const fire = (ex: string) => {
    useArm.getState().setTranscript(ex, true);
    const cmd = parseVoice(ex);
    if (!cmd) return;
    if (cmd.kind === "ai") void runAi(cmd.text);
    else useArm.getState().applyCommand(cmd);
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={listening}
          aria-label={listening ? "Arrêter l'écoute" : "Commander à la voix"}
          className={cn(
            "relative grid size-14 shrink-0 place-items-center rounded-full transition-[transform,background-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)] active:scale-[0.96] sm:size-16",
            listening
              ? "bg-accent text-accent-fg shadow-[0_0_0_8px_color-mix(in_oklab,var(--color-accent)_22%,transparent)]"
              : "bg-surface-2 text-fg shadow-[var(--shadow-border)]",
          )}
        >
          <Mic className="size-6" />
          {listening ? (
            <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-accent/50" />
          ) : null}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
            {listening ? "Écoute" : "Voix · T-Display S3"}
          </p>
          <p className="truncate text-sm text-fg">
            {aiBusy
              ? "Planification…"
              : transcript || lastHeard || "Appuie et dis « ouvre la pince »"}
          </p>
          {lastCommand ? (
            <p className="truncate font-mono text-xs text-muted tabular-nums">{lastCommand}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => useArm.getState().setHelpOpen(!helpOpen)}
        >
          <span className="hidden sm:inline">Commandes</span>
          <span className="sm:hidden">Liste</span>
        </Button>
      </div>
      <div className="mx-auto mt-2 flex max-w-[1400px] flex-wrap gap-1.5">
        {(helpOpen ? VOICE_EXAMPLES : QUICK).map((ex) => (
          <button
            key={ex}
            type="button"
            className="h-9 rounded-full bg-surface-2 px-3 text-xs text-muted transition-colors duration-[var(--motion-quick)] hover:text-fg"
            onClick={() => fire(ex)}
          >
            {ex}
          </button>
        ))}
      </div>
      {aiBusy ? (
        <div className="mx-auto mt-2 flex max-w-[1400px] items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          L’IA compose une séquence
        </div>
      ) : null}
    </div>
  );
}