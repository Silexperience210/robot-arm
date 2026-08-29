import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  clampJoints,
  dist,
  durationFor,
  forwardKinematics,
  gripGapMeters,
  hazard,
  lookAt,
  lerpJoints,
  nudgeCartesian,
  quintic,
  reachRatio,
  simulateUltrasonic,
} from "./kinematics";
import { missionById, waypointsFor } from "./missions";
import { nearestPart, resetParts, seedParts, grabPoint, gotoPath, grabPath, homePath } from "./parts";
import {
  HOME_JOINTS,
  PRINTER,
  BIN_POS,
  BIN_RIGHT,
  type JogMode,
  type JogStep,
  type JointId,
  type Joints,
  type LogEntry,
  type Vec3,
  type VoiceCommand,
  type Waypoint,
  type WorldPart,
} from "./types";
import { describeCommand } from "./voice";

type PlayMode = "idle" | "sequence" | "mission";

export const visual = {
  current: { ...HOME_JOINTS } as Joints,
  parts: seedParts() as WorldPart[],
  heldId: null as string | null,
  ultrasonic: 18,
  tcp: [0, 0.1, 0.15] as Vec3,
  hazard: null as string | null,
  reach: 0.55,
};

type ArmStore = {
  target: Joints;
  speed: number;
  held: boolean;
  ultrasonic: number;
  listening: boolean;
  transcript: string;
  lastHeard: string;
  lastCommand: string;
  logs: LogEntry[];
  sequence: Waypoint[];
  playMode: PlayMode;
  playIndex: number;
  missionId: string | null;
  helpOpen: boolean;
  liveUrl: string;
  connected: boolean;
  connecting: boolean;
  batteryV: number;
  panel: "voix" | "missions" | "sequence" | "kit" | "oeil";
  aiBusy: boolean;
  camUrl: string;
  camLive: boolean;
  jogMode: JogMode;
  jogStep: JogStep;
  focusId: string | null;
  activeWaypoints: Waypoint[];
  nudge: (joint: JointId, delta: number) => void;
  setJoint: (joint: JointId, value: number) => void;
  setTarget: (joints: Joints) => void;
  setSpeed: (v: number) => void;
  applyCommand: (cmd: VoiceCommand) => void;
  setListening: (v: boolean) => void;
  setTranscript: (t: string, final?: boolean) => void;
  playMission: (id: string) => void;
  playSequence: () => void;
  stop: () => void;
  recordWaypoint: (label?: string) => void;
  removeWaypoint: (id: string) => void;
  clearSequence: () => void;
  tick: (dt: number) => void;
  log: (kind: LogEntry["kind"], text: string) => void;
  setPanel: (p: ArmStore["panel"]) => void;
  setHelpOpen: (v: boolean) => void;
  setLiveUrl: (v: string) => void;
  setConnected: (v: boolean) => void;
  setAiBusy: (v: boolean) => void;
  connectLive: () => void;
  disconnectLive: () => void;
  goHome: () => void;
  setCamUrl: (v: string) => void;
  setCamLive: (v: boolean) => void;
  lookAtPart: () => void;
  resetPart: () => void;
  toggleGrip: () => void;
  goToPoint: (p: Vec3) => void;
  setJogMode: (m: JogMode) => void;
  setJogStep: (s: JogStep) => void;
  jogCart: (axis: "x" | "y" | "z", sign: number) => void;
  grabNearest: () => void;
  grabPart: (id: string) => void;
  focusPart: (id: string | null) => void;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

let holdLeft = 0;
let uiAcc = 0;
let socket: WebSocket | null = null;
let segT = 0;
let segDur = 0.3;
let segFrom: Joints = { ...HOME_JOINTS };
let segTo: Joints = { ...HOME_JOINTS };
let inSeg = false;

function sendPose(joints?: Joints) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const { target, speed } = useArm.getState();
  socket.send(JSON.stringify({ t: "pose", j: joints ?? target, spd: speed }));
}

function startSeg(from: Joints, to: Joints, speed: number, holdMs: number) {
  segFrom = { ...from };
  segTo = { ...to };
  segDur = durationFor(from, to, speed);
  segT = 0;
  holdLeft = holdMs / 1000;
  inSeg = true;
}

function playList(list: Waypoint[], missionId: string, speed: number) {
  if (!list.length) return;
  holdLeft = 0;
  startSeg(visual.current, list[0].joints, speed, list[0].holdMs);
  useArm.setState({
    playMode: "mission",
    missionId,
    playIndex: 0,
    target: { ...list[0].joints },
    activeWaypoints: list,
  });
}

function floorFor(p: WorldPart): number {
  const overLeft = dist(p.pos, BIN_POS) < 0.048;
  const overRight = dist(p.pos, BIN_RIGHT) < 0.048;
  const overBed = p.pos[2] > 0.14 && Math.abs(p.pos[0] - PRINTER.origin[0]) < 0.07;
  if (overLeft || overRight) return 0.02;
  if (overBed) return PRINTER.bedY + 0.012;
  return 0.012;
}

export const useArm = create<ArmStore>()(
  persist(
    (set, get) => ({
      target: { ...HOME_JOINTS },
      speed: 0.62,
      held: false,
      ultrasonic: 18,
      listening: false,
      transcript: "",
      lastHeard: "",
      lastCommand: "",
      logs: [],
      sequence: [],
      playMode: "idle",
      playIndex: 0,
      missionId: null,
      helpOpen: false,
      liveUrl: "ws://192.168.4.1:81",
      connected: false,
      connecting: false,
      batteryV: 3.94,
      panel: "missions",
      aiBusy: false,
      camUrl: "http://192.168.4.2:81/stream",
      camLive: false,
      jogMode: "cart",
      jogStep: 8,
      focusId: "fail",
      activeWaypoints: [],
      log: (kind, text) =>
        set((s) => ({
          logs: [{ id: uid(), at: Date.now(), kind, text }, ...s.logs].slice(0, 48),
        })),
      nudge: (joint, delta) => {
        const t = { ...get().target, [joint]: get().target[joint] + delta };
        set({ target: clampJoints(t), playMode: "idle", missionId: null });
        inSeg = false;
      },
      setJoint: (joint, value) => {
        const t = { ...get().target, [joint]: value };
        set({ target: clampJoints(t), playMode: "idle", missionId: null });
        inSeg = false;
      },
      setTarget: (joints) => {
        set({ target: clampJoints(joints), playMode: "idle", missionId: null });
        inSeg = false;
      },
      setSpeed: (v) => set({ speed: Math.max(0.15, Math.min(1, v)) }),
      goHome: () => {
        const list = homePath(visual.current);
        if (!list.length) {
          inSeg = false;
          set({ target: { ...HOME_JOINTS }, playMode: "idle", missionId: null });
          return;
        }
        playList(list, "home", get().speed);
      },
      stop: () => {
        inSeg = false;
        holdLeft = 0;
        set({ target: { ...visual.current }, playMode: "idle", missionId: null });
      },
      setListening: (listening) => set({ listening }),
      setTranscript: (transcript, final) => {
        if (final) set({ transcript, lastHeard: transcript });
        else set({ transcript });
      },
      setPanel: (panel) => set({ panel }),
      setHelpOpen: (helpOpen) => set({ helpOpen }),
      setLiveUrl: (liveUrl) => set({ liveUrl }),
      setConnected: (connected) => set({ connected }),
      setAiBusy: (aiBusy) => set({ aiBusy }),
      setCamUrl: (camUrl) => set({ camUrl }),
      setCamLive: (camLive) => set({ camLive }),
      setJogMode: (jogMode) => set({ jogMode }),
      setJogStep: (jogStep) => set({ jogStep }),
      focusPart: (focusId) => set({ focusId }),
      jogCart: (axis, sign) => {
        const mm = get().jogStep * sign * 0.001;
        set({
          target: nudgeCartesian(get().target, axis, mm),
          playMode: "idle",
          missionId: null,
        });
        inSeg = false;
      },
      goToPoint: (p) => {
        const s = get();
        const hover: Vec3 = [p[0], Math.max(p[1], 0.022) + 0.012, p[2]];
        const list = gotoPath(visual.current, hover);
        if (!list.length) {
          s.setTarget(lookAt(s.target, hover, s.target.grip));
          return;
        }
        playList(list, "goto", s.speed);
        s.log(
          "system",
          `Goto ${Math.round(p[0] * 1000)} ${Math.round(p[1] * 1000)} ${Math.round(p[2] * 1000)} mm`,
        );
      },
      lookAtPart: () => {
        const s = get();
        const focused = visual.parts.find((p) => p.id === s.focusId) ?? visual.parts[0];
        if (!focused) return;
        const p = focused.pos;
        s.setTarget(lookAt(s.target, [p[0], p[1] + 0.05, p[2]], s.target.grip));
        s.log("system", `Visée ${focused.kind.toUpperCase()}`);
      },
      resetPart: () => {
        resetParts(visual.parts);
        visual.heldId = null;
        set({ held: false });
        get().log("system", "Atelier réinitialisé — 3 pièces");
      },
      toggleGrip: () => {
        const g = get().target.grip;
        get().setJoint("grip", g > 40 ? 6 : 82);
      },
      grabPart: (id) => {
        const s = get();
        const n = visual.parts.find((p) => p.id === id && !p.held);
        if (!n) {
          s.log("system", "Rien à attraper");
          return;
        }
        set({ focusId: n.id });
        const list = grabPath(n, visual.current);
        if (!list.length) {
          s.setTarget(lookAt(s.target, [n.pos[0], n.pos[1] + 0.008, n.pos[2]], 8));
          s.log("system", `Prise ${n.kind.toUpperCase()}`);
          return;
        }
        playList(list, "grab", s.speed);
        s.log("system", `Prise ${n.kind.toUpperCase()}`);
      },
      grabNearest: () => {
        const s = get();
        const focused = visual.parts.find((p) => p.id === s.focusId && !p.held);
        const n =
          focused ??
          nearestPart(visual.parts, visual.tcp, 0.28) ??
          visual.parts.find((p) => !p.held) ??
          null;
        if (!n) {
          s.log("system", "Aucune pièce");
          return;
        }
        s.grabPart(n.id);
      },
      disconnectLive: () => {
        socket?.close();
        socket = null;
        set({ connected: false, connecting: false });
      },
      connectLive: () => {
        const url = get().liveUrl;
        socket?.close();
        set({ connecting: true });
        try {
          const ws = new WebSocket(url);
          socket = ws;
          ws.onopen = () => {
            set({ connected: true, connecting: false });
            get().log("system", "T-Display S3 en ligne");
            sendPose();
          };
          ws.onclose = () => {
            if (socket === ws) {
              socket = null;
              set({ connected: false, connecting: false });
            }
          };
          ws.onerror = () => {
            get().log("system", "Carte injoignable — simulateur actif");
            set({ connecting: false, connected: false });
          };
        } catch {
          set({ connecting: false, connected: false });
          get().log("system", "WebSocket refusé par le navigateur");
        }
      },
      recordWaypoint: (label) => {
        const { target, sequence } = get();
        const wp: Waypoint = {
          id: uid(),
          label: label ?? `P${sequence.length + 1}`,
          joints: { ...target },
          holdMs: 320,
        };
        set({ sequence: [...sequence, wp] });
        get().log("system", `Waypoint ${wp.label} mémorisé`);
      },
      removeWaypoint: (id) =>
        set((s) => ({ sequence: s.sequence.filter((w) => w.id !== id) })),
      clearSequence: () => set({ sequence: [], playMode: "idle" }),
      playSequence: () => {
        const { sequence, speed } = get();
        if (!sequence.length) return;
        holdLeft = 0;
        startSeg(visual.current, sequence[0].joints, speed, sequence[0].holdMs);
        set({
          playMode: "sequence",
          playIndex: 0,
          target: { ...sequence[0].joints },
          activeWaypoints: sequence,
        });
        get().log("mission", "Lecture de la séquence");
      },
      playMission: (id) => {
        const m = missionById(id);
        if (!m) return;
        if (id === "color" || id === "pickup") {
          const allInBin =
            visual.parts.every((p) => dist(p.pos, BIN_POS) < 0.05 || dist(p.pos, BIN_RIGHT) < 0.05);
          if (allInBin) resetParts(visual.parts);
        }
        const list = waypointsFor(id, visual.parts, visual.current);
        if (!list.length) return;
        playList(list, id, get().speed);
        get().log("mission", m.title);
      },
      applyCommand: (cmd) => {
        const s = get();
        const label = describeCommand(cmd);
        set({ lastCommand: label });
        s.log("voice", label);
        switch (cmd.kind) {
          case "nudge":
            s.nudge(cmd.joint, cmd.delta);
            break;
          case "set":
            s.setJoint(cmd.joint, cmd.value);
            break;
          case "cartesian":
            set({
              target: nudgeCartesian(s.target, cmd.axis, cmd.delta),
              playMode: "idle",
              missionId: null,
            });
            inSeg = false;
            break;
          case "stop":
            s.stop();
            break;
          case "speed":
            s.setSpeed(cmd.value);
            break;
          case "mission":
            s.playMission(cmd.id);
            break;
          case "home":
            s.goHome();
            break;
          case "record":
            s.recordWaypoint();
            break;
          case "play":
            s.playSequence();
            break;
          case "clear":
            s.clearSequence();
            break;
          case "help":
            set({ helpOpen: true, panel: "voix" });
            break;
          case "eye":
            set({ panel: "oeil" });
            break;
          case "look":
            s.lookAtPart();
            break;
          case "reset":
            s.resetPart();
            break;
          case "goto": {
            const dest: Record<typeof cmd.place, Vec3> = {
              bed: [PRINTER.origin[0], PRINTER.bedY + 0.05, PRINTER.origin[2]],
              binL: [BIN_POS[0], 0.08, BIN_POS[2]],
              binR: [BIN_RIGHT[0], 0.08, BIN_RIGHT[2]],
            };
            s.goToPoint(dest[cmd.place]);
            break;
          }
          case "grab":
            s.grabNearest();
            break;
          case "ai":
            break;
        }
      },
      tick: (dt) => {
        const s = get();
        const c = visual.current;

        if (s.playMode !== "idle" && inSeg) {
          segT += dt / Math.max(0.05, segDur);
          const u = quintic(segT);
          const next = lerpJoints(segFrom, segTo, u);
          c.base = next.base;
          c.shoulder = next.shoulder;
          c.elbow = next.elbow;
          c.wrist = next.wrist;
          c.grip = next.grip;
          if (segT >= 1) {
            c.base = segTo.base;
            c.shoulder = segTo.shoulder;
            c.elbow = segTo.elbow;
            c.wrist = segTo.wrist;
            c.grip = segTo.grip;
            inSeg = false;
          }
        } else if (s.playMode === "idle") {
          const k = 1 - Math.exp(-s.speed * 9 * dt);
          const t = s.target;
          c.base += (t.base - c.base) * k;
          c.shoulder += (t.shoulder - c.shoulder) * k;
          c.elbow += (t.elbow - c.elbow) * k;
          c.wrist += (t.wrist - c.wrist) * k;
          c.grip += (t.grip - c.grip) * k;
        }

        const fk = forwardKinematics(c);
        visual.tcp = fk.tcp;
        const gap = gripGapMeters(c.grip);
        const tip = grabPoint(fk);

        if (!visual.heldId && gap < 0.028 && c.grip < 42) {
          const focused = visual.parts.find((p) => p.id === s.focusId && !p.held);
          let hit =
            nearestPart(visual.parts, tip, 0.062) ?? nearestPart(visual.parts, fk.tcp, 0.055);
          if (!hit && focused) {
            const d = dist(tip, focused.pos);
            if (d < 0.095) hit = focused;
          }
          if (hit) {
            hit.held = true;
            visual.heldId = hit.id;
          }
        }

        for (const p of visual.parts) {
          if (p.id === visual.heldId) {
            p.pos[0] = tip[0];
            p.pos[1] = tip[1];
            p.pos[2] = tip[2];
            if (gap > 0.03) {
              p.held = false;
              visual.heldId = null;
              p.pos[1] = Math.max(0.012, tip[1]);
            }
          } else {
            const floor = floorFor(p);
            if (p.pos[1] > floor) p.pos[1] = Math.max(floor, p.pos[1] - 0.55 * dt);
            if (dist(p.pos, BIN_POS) < 0.048 && p.pos[1] <= 0.025) {
              p.pos[0] = BIN_POS[0];
              p.pos[2] = BIN_POS[2];
            }
            if (dist(p.pos, BIN_RIGHT) < 0.048 && p.pos[1] <= 0.025) {
              p.pos[0] = BIN_RIGHT[0];
              p.pos[2] = BIN_RIGHT[2];
            }
          }
        }

        visual.ultrasonic = simulateUltrasonic(
          fk.tcp,
          fk.toolDir,
          visual.parts.map((p) => p.pos),
          Boolean(visual.heldId),
        );
        visual.hazard = hazard(fk.tcp, visual.ultrasonic);
        visual.reach = reachRatio(fk.tcp);

        let playMode = s.playMode;
        let playIndex = s.playIndex;
        let target = s.target;
        let missionId = s.missionId;
        let playChanged = false;
        const list = s.activeWaypoints;

        if (playMode !== "idle") {
          const wp = list[playIndex];
          if (!wp) {
            playMode = "idle";
            missionId = null;
            playChanged = true;
            inSeg = false;
          } else if (!inSeg) {
            holdLeft -= dt;
            if (holdLeft <= 0) {
              playIndex += 1;
              const next = list[playIndex];
              if (next) {
                target = { ...next.joints };
                startSeg(visual.current, next.joints, s.speed, next.holdMs);
              } else {
                playMode = "idle";
                missionId = null;
                inSeg = false;
              }
              playChanged = true;
            }
          }
        }

        uiAcc += dt;
        if (playChanged || uiAcc > 0.1) {
          uiAcc = 0;
          const patch: Partial<ArmStore> = {
            ultrasonic: visual.ultrasonic,
            held: Boolean(visual.heldId),
          };
          if (playChanged) {
            patch.playMode = playMode;
            patch.playIndex = playIndex;
            patch.target = target;
            patch.missionId = missionId;
          }
          set(patch);
          if (socket) sendPose(visual.current);
        }
      },
    }),
    {
      name: "pince-v3",
      partialize: (s) => ({
        sequence: s.sequence,
        liveUrl: s.liveUrl,
        speed: s.speed,
        camUrl: s.camUrl,
        jogMode: s.jogMode,
        jogStep: s.jogStep,
      }),
    },
  ),
);

useArm.subscribe((s, prev) => {
  if (s.target !== prev.target || s.speed !== prev.speed) sendPose();
});

export function cartesianTo(point: Vec3) {
  const s = useArm.getState();
  s.setTarget(lookAt(s.target, point, s.target.grip));
}
