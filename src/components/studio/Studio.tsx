import { Cpu, Hand, Radio, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { ArmViewport, viewApi } from "@/components/scene/ArmViewport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TDISPLAY } from "@/lib/arm/board";
import { useArm } from "@/lib/arm/store";
import { parseVoice } from "@/lib/arm/voice";
import { cn } from "@/lib/utils";
import { JointPanel } from "./JointPanel";
import { KitPanel } from "./KitPanel";
import { MissionPanel } from "./MissionPanel";
import { JogPad, TcpHud } from "./Pendant";
import { SequencePanel } from "./SequencePanel";
import { EyeFeed, EyeLink } from "./EyeFeed";
import { TDisplay } from "./TDisplay";
import { useVoice } from "./useVoice";
import { VoiceDock } from "./VoiceDock";

const TABS = [
  { id: "voix" as const, label: "Jog", mobileOnly: true },
  { id: "missions" as const, label: "Missions", mobileOnly: false },
  { id: "sequence" as const, label: "Séquence", mobileOnly: false },
  { id: "oeil" as const, label: "Œil", mobileOnly: false },
  { id: "kit" as const, label: "Kit", mobileOnly: false },
];

export function Studio() {
  const panel = useArm((s) => s.panel);
  const held = useArm((s) => s.held);
  const ultrasonic = useArm((s) => s.ultrasonic);
  const connected = useArm((s) => s.connected);
  const playMode = useArm((s) => s.playMode);
  const { runAi } = useVoice();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const arm = useArm.getState();
      if (e.code === "Space") {
        e.preventDefault();
        arm.stop();
        return;
      }
      if (e.key === "h" || e.key === "H") arm.goHome();
      if (e.key === "g" || e.key === "G") arm.toggleGrip();
      if (e.key === "p" || e.key === "P") arm.grabNearest();
      if (e.key === "r" || e.key === "R") arm.resetPart();
      if (e.key === "f" || e.key === "F") viewApi.reset();
      if (e.key === "c" || e.key === "C") arm.playMission("color");
      if (e.key === "t" || e.key === "T") arm.recordWaypoint();
      if (e.key === "w" || e.key === "W") arm.jogCart("z", 1);
      if (e.key === "s" || e.key === "S") arm.jogCart("z", -1);
      if (e.key === "a" || e.key === "A") arm.jogCart("x", -1);
      if (e.key === "d" || e.key === "D") arm.jogCart("x", 1);
      if (e.key === "q" || e.key === "Q") arm.nudge("base", -8);
      if (e.key === "e" || e.key === "E") arm.nudge("base", 8);
      if (e.key === "ArrowLeft") arm.nudge("base", -6);
      if (e.key === "ArrowRight") arm.nudge("base", 6);
      if (e.key === "ArrowUp") {
        e.preventDefault();
        arm.jogCart("y", 1);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        arm.jogCart("y", -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submitTyped = () => {
    const t = typed.trim();
    if (!t) return;
    useArm.getState().setTranscript(t, true);
    const cmd = parseVoice(t);
    if (cmd?.kind === "ai") void runAi(cmd.text);
    else if (cmd) useArm.getState().applyCommand(cmd);
    else void runAi(t);
    setTyped("");
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-medium tracking-tight text-fg">PINCE</p>
          <p className="truncate text-xs text-muted">{TDISPLAY.short} · teach pendant · vision</p>
        </div>
        <Badge variant={connected ? "ok" : "default"}>
          {connected ? "T-Display S3" : "Simulateur"}
        </Badge>
        <Badge variant={held ? "accent" : "default"}>
          <Hand className="mr-1 size-3" />
          {held ? "Tenu" : "Libre"}
        </Badge>
        <span className="hidden font-mono text-xs tabular-nums text-muted sm:inline">
          US {ultrasonic.toFixed(1)} cm
        </span>
        {playMode !== "idle" ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => useArm.getState().stop()}>
            <Square className="size-3.5" />
            Stop
          </Button>
        ) : null}
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden grid-cols-1 grid-rows-[minmax(260px,46vh)_minmax(0,1fr)] lg:grid-cols-[272px_minmax(0,1fr)_280px] lg:grid-rows-1">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-border p-4 lg:block">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-faint">Pendant</p>
          <JogPad />
          <p className="mb-3 mt-6 text-xs font-medium uppercase tracking-[0.14em] text-faint">Axes</p>
          <JointPanel />
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              submitTyped();
            }}
          >
            <label className="text-xs font-medium uppercase tracking-[0.14em] text-faint" htmlFor="cmd">
              Commande
            </label>
            <input
              id="cmd"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="trie par couleur…"
              className="mt-2 h-11 w-full rounded-md bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </form>
        </aside>

        <section className="relative min-h-0 overflow-hidden">
          <ArmViewport />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg/80 px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted">
              <Radio className="size-3" />
              {connected ? "live" : "sim"}
            </span>
            <TcpHud />
          </div>
          <button
            type="button"
            className="pointer-events-auto absolute right-3 top-3 hidden h-9 rounded-full bg-bg/80 px-3 text-[11px] text-muted md:inline-flex md:items-center"
            onClick={() => viewApi.reset()}
          >
            Cadrer
          </button>
          {panel !== "oeil" ? (
            <div className="pointer-events-auto absolute left-3 bottom-3 hidden md:block">
              <EyeFeed compact />
            </div>
          ) : null}
          <div className="pointer-events-auto absolute bottom-3 right-3 hidden origin-bottom-right md:block">
            <TDisplay compact />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden border-t border-border lg:border-l lg:border-t-0">
          <div className="flex shrink-0 gap-1 overflow-x-auto p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => useArm.getState().setPanel(tab.id)}
                className={cn(
                  "h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-colors duration-[var(--motion-quick)]",
                  tab.mobileOnly && "lg:hidden",
                  panel === tab.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {panel === "voix" ? (
              <div className="lg:hidden">
                <JogPad />
                <div className="mt-6">
                  <JointPanel />
                </div>
                <form
                  className="mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitTyped();
                  }}
                >
                  <label className="text-xs text-faint" htmlFor="cmd-m">
                    Commande écrite
                  </label>
                  <input
                    id="cmd-m"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="enlève la pièce"
                    className="mt-2 h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-faint"
                  />
                </form>
              </div>
            ) : null}
            {panel === "voix" ? (
              <div className="hidden lg:block">
                <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-faint">
                  <Cpu className="size-3.5" />
                  Missions
                </p>
                <MissionPanel />
              </div>
            ) : null}
            {panel === "missions" ? <MissionPanel /> : null}
            {panel === "sequence" ? <SequencePanel /> : null}
            {panel === "oeil" ? (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">ESP32-CAM</p>
                <EyeFeed />
                <EyeLink />
              </div>
            ) : null}
            {panel === "kit" ? <KitPanel /> : null}
          </div>
        </aside>
      </div>

      <VoiceDock />
    </div>
  );
}