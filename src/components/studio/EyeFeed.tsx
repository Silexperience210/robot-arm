import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CAM, worldToCam } from "@/lib/arm/eye";
import { BIN_POS, BIN_RIGHT, KIND_META, PRINTER } from "@/lib/arm/types";
import { useArm, visual } from "@/lib/arm/store";
import { cn } from "@/lib/utils";

function drawSim(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = "#141610";
  ctx.fillRect(0, 0, w, h);

  const pad = 10;
  const bed = Math.min(w, h) - pad * 2;
  const bx = (w - bed) / 2;
  const by = (h - bed) / 2;

  ctx.fillStyle = "#2a2c26";
  ctx.fillRect(bx - 5, by - 5, bed + 10, bed + 10);
  ctx.fillStyle = "#7a818c";
  ctx.fillRect(bx, by, bed, bed);

  ctx.strokeStyle = "rgba(18,20,16,0.32)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const o = (bed / 4) * i;
    ctx.beginPath();
    ctx.moveTo(bx + o, by);
    ctx.lineTo(bx + o, by + bed);
    ctx.moveTo(bx, by + o);
    ctx.lineTo(bx + bed, by + o);
    ctx.stroke();
  }

  const map = (p: { x: number; y: number }) => ({
    x: bx + p.x * bed,
    y: by + p.y * bed,
  });

  const drawBin = (world: typeof BIN_POS, label: string) => {
    const c = worldToCam(world);
    const p = map(c);
    ctx.strokeStyle = "#5c5f56";
    ctx.strokeRect(p.x - 12, p.y - 12, 24, 24);
    ctx.fillStyle = "#5c5f56";
    ctx.font = "7px IBM Plex Mono, monospace";
    ctx.fillText(label, p.x - 10, p.y + 18);
  };
  drawBin(BIN_POS, "L PLA");
  drawBin(BIN_RIGHT, "R PETG");

  const tcp = worldToCam(visual.tcp);
  if (tcp.visible) {
    const g = map(tcp);
    const open = 6 + (visual.current.grip / 90) * 10;
    ctx.strokeStyle = "#c5d0c2";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x - open, g.y - 5);
    ctx.lineTo(g.x - open, g.y + 5);
    ctx.moveTo(g.x + open, g.y - 5);
    ctx.lineTo(g.x + open, g.y + 5);
    ctx.stroke();
  }

  for (const part of visual.parts) {
    const cam = worldToCam(part.pos);
    if (!cam.visible) continue;
    const p = map(cam);
    const meta = KIND_META[part.kind];
    const size = part.held ? 10 : 13;
    ctx.fillStyle = meta.color;
    if (part.kind === "petg") {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, size / 2, size / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
    const conf = 86 + ((t + part.id.charCodeAt(0)) % 9);
    ctx.strokeStyle = meta.accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(p.x - size / 2 - 5, p.y - size / 2 - 7, size + 10, size + 14);
    ctx.setLineDash([]);
    ctx.font = "8px IBM Plex Mono, monospace";
    ctx.fillStyle = meta.accent;
    ctx.fillText(`${meta.label} ${conf}%`, p.x - size / 2 - 5, p.y - size / 2 - 10);
  }

  ctx.fillStyle = "rgba(11,12,11,0.12)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

  const flicker = 0.04 + Math.sin(t * 0.008) * 0.02;
  ctx.fillStyle = `rgba(197,208,194,${flicker})`;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#8aa37a";
  ctx.font = "8px IBM Plex Mono, monospace";
  ctx.fillText("DET", 8, 12);
  ctx.beginPath();
  ctx.arc(32, 9, 3, 0, Math.PI * 2);
  ctx.fillStyle = t % 80 < 40 ? "#c47a6a" : "#5c5f56";
  ctx.fill();
  ctx.fillStyle = "#8b8e82";
  ctx.fillText(`${CAM.sensor}  VGA`, w - 78, 12);
  ctx.fillText(`${visual.parts.length} cls`, 8, h - 8);
}

export function EyeFeed({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camUrl = useArm((s) => s.camUrl);
  const camLive = useArm((s) => s.camLive);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (camLive) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 1;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
        c.width = Math.floor(w * dpr);
        c.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSim(ctx, w, h, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camLive]);

  useEffect(() => {
    setBroken(false);
  }, [camUrl, camLive]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const pad = 10;
    const bed = Math.min(w, h) - pad * 2;
    const bx = (w - bed) / 2;
    const by = (h - bed) / 2;
    const u = (e.clientX - rect.left - bx) / bed;
    const v = (e.clientY - rect.top - by) / bed;
    const s = PRINTER.bedSize * 1.15;
    const x = PRINTER.origin[0] + (u - 0.5) * s;
    const z = PRINTER.origin[2] + (v - 0.5) * s;
    useArm.getState().goToPoint([x, PRINTER.bedY + 0.04, z]);
  };

  return (
    <div className={cn("overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]", compact ? "w-[176px]" : "w-full max-w-[280px]")}>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[9px] font-medium tracking-[0.16em] text-faint">ŒIL</span>
        <span className="text-[9px] text-faint">{camLive && !broken ? "LIVE" : "DET OV2640"}</span>
      </div>
      <div className="relative aspect-[4/3] bg-bg">
        {camLive && !broken ? (
          <img
            src={camUrl}
            alt="Flux ESP32-CAM"
            className="h-full w-full object-cover"
            onError={() => {
              setBroken(true);
              useArm.getState().setCamLive(false);
              useArm.getState().log("system", "Flux CAM injoignable — simulateur");
            }}
          />
        ) : (
          <canvas ref={canvasRef} className="h-full w-full cursor-crosshair" onClick={onCanvasClick} />
        )}
      </div>
      <div className="flex items-center justify-between px-2 py-1">
        <button
          type="button"
          className="h-7 rounded-full px-2 text-[10px] text-muted hover:text-fg"
          onClick={() => {
            const live = !useArm.getState().camLive;
            useArm.getState().setCamLive(live);
            if (live) useArm.getState().log("system", "Tentative flux ESP32-CAM");
          }}
        >
          {camLive ? "Sim" : "Flux"}
        </button>
        <button
          type="button"
          className="h-7 rounded-full px-2 text-[10px] text-muted hover:text-fg"
          onClick={() => useArm.getState().lookAtPart()}
        >
          Viser
        </button>
      </div>
    </div>
  );
}

export function EyeLink() {
  const camUrl = useArm((s) => s.camUrl);
  const camLive = useArm((s) => s.camLive);
  return (
    <div className="flex flex-col gap-3 text-sm text-muted">
      <p>
        {CAM.name} sur le portique. Le simulateur classe PLA, PETG et rejet. Clique le flux pour
        envoyer la pince.
      </p>
      <label className="text-xs font-medium uppercase tracking-[0.14em] text-faint" htmlFor="cam-url">
        URL flux
      </label>
      <input
        id="cam-url"
        value={camUrl}
        onChange={(e) => useArm.getState().setCamUrl(e.target.value)}
        className="h-11 w-full rounded-md bg-surface-2 px-3 font-mono text-xs text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      <Button
        type="button"
        variant={camLive ? "outline" : "secondary"}
        onClick={() => useArm.getState().setCamLive(!camLive)}
      >
        {camLive ? "Revenir au simulateur" : "Ouvrir le flux réel"}
      </Button>
    </div>
  );
}