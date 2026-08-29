import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/plan-LKdVrO5s.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var planArm_createServerFn_handler = createServerRpc({
	id: "9a97e6112443cbf7e6bdcb98bccc1183b31a686930215fdb9d41e6c8c2e96e95",
	name: "planArm",
	filename: "src/lib/arm/plan.ts"
}, (opts) => planArm.__executeServer(opts));
var planArm = createServerFn({ method: "POST" }).validator((d) => d).handler(planArm_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "IA indisponible"
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 500,
			temperature: .2,
			messages: [{
				role: "system",
				content: `Tu pilotes PINCE, un bras 5 DDL + pince (servos 0–180°, pince 0 fermée à 90 ouverte).
Réponds UNIQUEMENT en JSON compact :
{"say":"phrase courte FR","mission":"pickup|color|inspect|hold|scan|wave|park"|null,"waypoints":[{"label":"…","joints":{"base":0-180,"shoulder":0-180,"elbow":0-180,"wrist":0-180,"grip":0-90},"holdMs":300}]}
Missions connues : pickup (enlever pièce imprimante), color (triage PLA/PETG/rejet), inspect, hold, scan, wave, park.
Si une mission suffit, mets-la et waypoints []. Sinon 2–6 waypoints. Pas de markdown.`
			}, {
				role: "user",
				content: `Pose actuelle ${JSON.stringify(data.joints)}. Objet tenu=${data.held}. Consigne: ${data.prompt}`
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `xAI ${res.status}`
	};
	const text = (await res.json()).choices[0]?.message.content ?? "";
	const jsonStart = text.indexOf("{");
	const jsonEnd = text.lastIndexOf("}");
	if (jsonStart < 0 || jsonEnd < 0) return {
		ok: false,
		error: "Réponse IA illisible"
	};
	try {
		const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
		return {
			ok: true,
			say: parsed.say ?? "C'est noté.",
			mission: parsed.mission || void 0,
			waypoints: parsed.waypoints
		};
	} catch {
		return {
			ok: false,
			error: "JSON IA invalide"
		};
	}
});
//#endregion
export { planArm_createServerFn_handler };
