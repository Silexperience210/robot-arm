import { createServerFn } from "@tanstack/react-start";
import type { Joints } from "./types";

export type PlanResult =
  | {
      ok: true;
      say: string;
      mission?: string;
      waypoints?: { label: string; joints: Joints; holdMs: number }[];
    }
  | { ok: false; error: string };

type PlanInput = {
  prompt: string;
  joints: Joints;
  held: boolean;
};

export const planArm = createServerFn({ method: "POST" })
  .validator((d: PlanInput) => d)
  .handler(async ({ data }): Promise<PlanResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "IA indisponible" };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 500,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `Tu pilotes PINCE, un bras 5 DDL + pince (servos 0–180°, pince 0 fermée à 90 ouverte).
Réponds UNIQUEMENT en JSON compact :
{"say":"phrase courte FR","mission":"pickup|color|inspect|hold|scan|wave|park"|null,"waypoints":[{"label":"…","joints":{"base":0-180,"shoulder":0-180,"elbow":0-180,"wrist":0-180,"grip":0-90},"holdMs":300}]}
Missions connues : pickup (enlever pièce imprimante), color (triage PLA/PETG/rejet), inspect, hold, scan, wave, park.
Si une mission suffit, mets-la et waypoints []. Sinon 2–6 waypoints. Pas de markdown.`,
          },
          {
            role: "user",
            content: `Pose actuelle ${JSON.stringify(data.joints)}. Objet tenu=${data.held}. Consigne: ${data.prompt}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: `xAI ${res.status}` };
    const body = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const text = body.choices[0]?.message.content ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return { ok: false, error: "Réponse IA illisible" };
    try {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
        say?: string;
        mission?: string | null;
        waypoints?: { label: string; joints: Joints; holdMs: number }[];
      };
      return {
        ok: true,
        say: parsed.say ?? "C'est noté.",
        mission: parsed.mission || undefined,
        waypoints: parsed.waypoints,
      };
    } catch {
      return { ok: false, error: "JSON IA invalide" };
    }
  });
