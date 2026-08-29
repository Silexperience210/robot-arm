import { useCallback, useEffect, useRef } from "react";
import { planArm } from "@/lib/arm/plan";
import { useArm } from "@/lib/arm/store";
import { parseVoice } from "@/lib/arm/voice";
import type { VoiceCommand } from "@/lib/arm/types";

function getRec(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "fr-FR";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  return rec;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = 1.04;
  u.pitch = 0.98;
  window.speechSynthesis.speak(u);
}

async function runAi(text: string) {
  const s = useArm.getState();
  s.setAiBusy(true);
  try {
    const res = await planArm({
      data: { prompt: text, joints: s.target, held: s.held },
    });
    if (!res.ok) {
      s.log("ai", res.error);
      speak("Je n'ai pas compris.");
      return;
    }
    s.log("ai", res.say);
    speak(res.say);
    if (res.mission) {
      s.playMission(res.mission);
      return;
    }
    if (res.waypoints?.length) {
      s.clearSequence();
      for (const wp of res.waypoints) {
        s.setTarget(wp.joints);
        s.recordWaypoint(wp.label);
      }
      s.playSequence();
    }
  } catch {
    s.log("ai", "Planification impossible");
  } finally {
    s.setAiBusy(false);
  }
}

export function useVoice() {
  const recRef = useRef<SpeechRecognition | null>(null);
  const wantRef = useRef(false);
  const lastFinal = useRef("");

  const handle = useCallback((cmd: VoiceCommand) => {
    if (cmd.kind === "ai") {
      void runAi(cmd.text);
      return;
    }
    useArm.getState().applyCommand(cmd);
    if (cmd.kind === "mission" || cmd.kind === "home" || cmd.kind === "stop") {
      const say =
        cmd.kind === "stop"
          ? "Arrêt"
          : cmd.kind === "home"
            ? "Position repos"
            : "Mission lancée";
      speak(say);
    }
  }, []);

  const start = useCallback(() => {
    wantRef.current = true;
    useArm.getState().setListening(true);
    if (!recRef.current) recRef.current = getRec();
    const rec = recRef.current;
    if (!rec) {
      useArm.getState().log("system", "Micro indisponible sur ce navigateur — Chrome ou Safari.");
      useArm.getState().setListening(false);
      return;
    }
    rec.onresult = (ev) => {
      let interim = "";
      let finalTxt = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        if (row.isFinal) finalTxt += row[0].transcript;
        else interim += row[0].transcript;
      }
      if (interim) useArm.getState().setTranscript(interim);
      if (finalTxt) {
        const t = finalTxt.trim();
        if (t && t !== lastFinal.current) {
          lastFinal.current = t;
          useArm.getState().setTranscript(t, true);
          const cmd = parseVoice(t);
          if (cmd) handle(cmd);
          else useArm.getState().log("voice", `Non reconnu : ${t}`);
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        useArm.getState().log("system", "Micro refusé — autorise-le dans le navigateur.");
        wantRef.current = false;
        useArm.getState().setListening(false);
      }
    };
    rec.onend = () => {
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      } else useArm.getState().setListening(false);
    };
    try {
      rec.start();
    } catch {
      /* double start */
    }
  }, [handle]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    useArm.getState().setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (wantRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(() => () => {
    wantRef.current = false;
    recRef.current?.abort();
  }, []);

  return { start, stop, toggle, runAi, speak };
}

export { speak };
