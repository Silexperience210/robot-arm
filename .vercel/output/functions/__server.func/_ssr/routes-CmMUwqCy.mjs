import { i as __toESM } from "../_runtime.mjs";
import { o as require_jsx_runtime, r as Slot, s as require_react } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { a as useFrame, i as Canvas, n as Grid, r as OrbitControls, t as ContactShadows } from "../_libs/@react-three/drei+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as Radio, c as Minus, d as Hand, f as Download, i as Square, l as Mic, o as Plus, p as Cpu, r as Trash2, s as Play, t as Unplug, u as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CmMUwqCy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var JOINT_IDS = [
	"base",
	"shoulder",
	"elbow",
	"wrist",
	"grip"
];
var JOINT_META = {
	base: {
		label: "Base",
		short: "Base",
		min: 0,
		max: 180,
		unit: "°"
	},
	shoulder: {
		label: "Épaule",
		short: "Épau.",
		min: 0,
		max: 180,
		unit: "°"
	},
	elbow: {
		label: "Coude",
		short: "Coude",
		min: 0,
		max: 180,
		unit: "°"
	},
	wrist: {
		label: "Poignet",
		short: "Poig.",
		min: 0,
		max: 180,
		unit: "°"
	},
	grip: {
		label: "Pince",
		short: "Pince",
		min: 0,
		max: 90,
		unit: "°"
	}
};
/** Ready pose in front of the printer (extended, below the gantry). */
var HOME_JOINTS = {
	base: 90,
	shoulder: 173,
	elbow: 8,
	wrist: 8,
	grip: 72
};
var ARM_DIM = {
	baseHeight: .04,
	l1: .12,
	l2: .105,
	l3: .058,
	jawLength: .038
};
var KIND_META = {
	pla: {
		label: "PLA",
		color: "#d9d0bf",
		accent: "#c5cbb8",
		bin: "L"
	},
	petg: {
		label: "PETG",
		color: "#3d4452",
		accent: "#5a6478",
		bin: "R"
	},
	fail: {
		label: "REJET",
		color: "#c47a6a",
		accent: "#a85c50",
		bin: "L"
	}
};
var PRINTER = {
	origin: [
		.015,
		0,
		.205
	],
	bedY: .074,
	bedSize: .12
};
var BIN_POS = [
	-.15,
	.012,
	.11
];
var BIN_RIGHT = [
	.16,
	.012,
	.11
];
var D2R$1 = Math.PI / 180;
var R2D = 180 / Math.PI;
function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}
function clampJoints(j) {
	return {
		base: clamp(j.base, 0, 180),
		shoulder: clamp(j.shoulder, 5, 175),
		elbow: clamp(j.elbow, 5, 175),
		wrist: clamp(j.wrist, 5, 175),
		grip: clamp(j.grip, 0, 90)
	};
}
function lerpJoints(a, b, t) {
	const k = clamp(t, 0, 1);
	return {
		base: a.base + (b.base - a.base) * k,
		shoulder: a.shoulder + (b.shoulder - a.shoulder) * k,
		elbow: a.elbow + (b.elbow - a.elbow) * k,
		wrist: a.wrist + (b.wrist - a.wrist) * k,
		grip: a.grip + (b.grip - a.grip) * k
	};
}
function maxJointError(a, b) {
	return Math.max(Math.abs(a.base - b.base), Math.abs(a.shoulder - b.shoulder), Math.abs(a.elbow - b.elbow), Math.abs(a.wrist - b.wrist), Math.abs(a.grip - b.grip));
}
function yawFromBase(base) {
	return (base - 90) * D2R$1;
}
function polar(radius, y, φ) {
	return [
		radius * Math.sin(φ),
		y,
		radius * Math.cos(φ)
	];
}
/** Forward kinematics matching the Three.js joint hierarchy. */
function forwardKinematics(j) {
	const { baseHeight: H, l1, l2, l3 } = ARM_DIM;
	const φ = yawFromBase(j.base);
	const θs = (90 - j.shoulder) * D2R$1;
	const θe = (90 - j.elbow) * D2R$1;
	const θw = (90 - j.wrist) * D2R$1;
	const p1 = θs;
	const p2 = θs + θe;
	const p3 = θs + θe + θw;
	const shoulder = [
		0,
		H,
		0
	];
	const eR = l1 * Math.cos(p1);
	const eY = H - l1 * Math.sin(p1);
	const elbow = polar(eR, eY, φ);
	const wR = eR + l2 * Math.cos(p2);
	const wY = eY - l2 * Math.sin(p2);
	const wrist = polar(wR, wY, φ);
	const tcp = polar(wR + l3 * Math.cos(p3), wY - l3 * Math.sin(p3), φ);
	const dirZ = Math.cos(p3);
	return {
		tcp,
		toolDir: [
			dirZ * Math.sin(φ),
			-Math.sin(p3),
			dirZ * Math.cos(φ)
		],
		yaw: φ,
		elbow,
		wrist,
		shoulder
	};
}
var PITCHES = [
	-88,
	-80,
	-70,
	-58,
	-45,
	-32,
	-20,
	-8
];
function ikAtPitch(target, grip, toolPitchDeg, elbowUp) {
	const { baseHeight: H, l1, l2, l3 } = ARM_DIM;
	const φ = Math.atan2(target[0], target[2]);
	const r = Math.hypot(target[0], target[2]);
	const tool = toolPitchDeg * D2R$1;
	const wr = r - l3 * Math.cos(tool);
	const wy = target[1] - H - l3 * Math.sin(tool);
	if (wr < .012) return null;
	const d = Math.hypot(wr, wy);
	const maxReach = l1 + l2 - .003;
	const minReach = Math.abs(l1 - l2) + .01;
	if (d > maxReach + .012 || d < minReach - .006) return null;
	const dClamped = clamp(d, minReach, maxReach);
	const wrU = wr * (dClamped / d);
	const wyU = wy * (dClamped / d);
	const cosEl = clamp((l1 * l1 + l2 * l2 - dClamped * dClamped) / (2 * l1 * l2), -1, 1);
	const elbowDown = Math.acos(cosEl) * R2D - 90;
	const elbow = elbowUp ? 180 - elbowDown : elbowDown;
	if (elbow < 4 || elbow > 176) return null;
	const alpha = Math.atan2(wyU, wrU);
	const cosB = clamp((l1 * l1 + dClamped * dClamped - l2 * l2) / (2 * l1 * dClamped), -1, 1);
	const beta = Math.acos(cosB);
	const shoulder = 90 + (elbowUp ? alpha - beta : alpha + beta) * R2D;
	if (shoulder < 4 || shoulder > 176) return null;
	const wrist = 90 + toolPitchDeg - (shoulder - 90) - (elbow - 90);
	if (wrist < 2 || wrist > 178) return null;
	const base = φ * R2D + 90;
	if (base < 0 || base > 180) return null;
	return clampJoints({
		base,
		shoulder,
		elbow,
		wrist,
		grip
	});
}
/**
* Search tool pitch + elbow config, pick the pose whose TCP is closest
* to the target and that clears the printer.
*/
function solveIK(target, grip, preferClear = true) {
	let best = null;
	let bestScore = Infinity;
	for (const pitch of PITCHES) for (const up of [false, true]) {
		const j = ikAtPitch(target, grip, pitch, up);
		if (!j) continue;
		const fk = forwardKinematics(j);
		const err = dist(fk.tcp, target);
		const hit = preferClear ? jointsHitPrinter(j) : null;
		const clampPen = (j.shoulder <= 6 || j.shoulder >= 174 ? .02 : 0) + (j.elbow <= 6 || j.elbow >= 174 ? .02 : 0) + (j.wrist <= 6 || j.wrist >= 174 ? .015 : 0);
		const downBonus = target[1] < .05 && fk.toolDir[1] < -.7 ? -.02 : 0;
		const foldPen = j.elbow > 110 ? .012 : 0;
		const score = err + (hit ? .22 : 0) + clampPen + (up ? .012 : 0) + downBonus + foldPen;
		if (score < bestScore) {
			bestScore = score;
			best = j;
		}
	}
	return best ?? {
		...VIA_JOINTS,
		grip
	};
}
function inverseKinematics(target, grip, toolPitchDeg) {
	if (toolPitchDeg == null) return solveIK(target, grip);
	return ikAtPitch(target, grip, toolPitchDeg, false) ?? ikAtPitch(target, grip, toolPitchDeg, true) ?? solveIK(target, grip);
}
function nudgeCartesian(joints, axis, meters) {
	const { tcp } = forwardKinematics(joints);
	const t = [...tcp];
	if (axis === "x") t[0] += meters;
	if (axis === "y") t[1] += meters;
	if (axis === "z") t[2] += meters;
	t[1] = clamp(t[1], .016, .24);
	return solveIK(t, joints.grip);
}
function lookAt(joints, point, grip = joints.grip) {
	return solveIK(point, grip);
}
function gripGapMeters(grip) {
	return .004 + clamp(grip, 0, 90) / 90 * .036;
}
function dist(a, b) {
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
function quintic(t) {
	const x = clamp(t, 0, 1);
	return x * x * x * (x * (6 * x - 15) + 10);
}
function durationFor(a, b, speed) {
	return Math.max(.22, maxJointError(a, b) / (42 + 95 * speed));
}
function reachRatio(tcp) {
	const { baseHeight: H, l1, l2, l3 } = ARM_DIM;
	return Math.hypot(tcp[0], tcp[2], tcp[1] - H) / (l1 + l2 + l3);
}
function simulateUltrasonic(tcp, toolDir, parts, held) {
	if (held) return 2.4;
	let nearest = 80;
	for (const p of parts) nearest = Math.min(nearest, dist(tcp, p) * 100);
	const bedY = PRINTER.bedY;
	const along = toolDir[1] < -.2 ? (tcp[1] - bedY) / Math.max(.05, -toolDir[1]) * 100 : 40;
	return clamp(Math.min(nearest, along), 1.2, 80);
}
var o = PRINTER.origin;
var s = PRINTER.bedSize;
var POSTS = [
	[o[0] - s / 2, o[2] - s / 2],
	[o[0] + s / 2, o[2] - s / 2],
	[o[0] - s / 2, o[2] + s / 2],
	[o[0] + s / 2, o[2] + s / 2]
];
o[2] - s / 2;
function inPrinterColumn(p) {
	return Math.abs(p[0] - o[0]) < s / 2 - .006 && Math.abs(p[2] - o[2]) < s / 2 - .006 && p[1] > PRINTER.bedY - .02 && p[1] < .23;
}
/** Solids: 4 posts + top plate. Bed is ignored so the gripper can work above it. */
function pointHitsPrinter(p) {
	const [x, y, z] = p;
	if (y < .004) return "sol";
	for (const [px, pz] of POSTS) if (Math.abs(x - px) < .02 && Math.abs(z - pz) < .02 && y >= 0 && y <= .232) return "montant";
	if (Math.abs(x - o[0]) < s / 2 + .024 && Math.abs(z - o[2]) < s / 2 + .024 && y >= .205 && y <= .242) return "portique";
	return null;
}
function lerp3(a, b, t) {
	return [
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t
	];
}
function chainSamples(fk) {
	const out = [
		fk.elbow,
		fk.wrist,
		fk.tcp
	];
	for (let i = 1; i < 5; i++) out.push(lerp3(fk.shoulder, fk.elbow, i / 5));
	for (let i = 1; i < 5; i++) out.push(lerp3(fk.elbow, fk.wrist, i / 5));
	for (let i = 1; i < 4; i++) out.push(lerp3(fk.wrist, fk.tcp, i / 4));
	return out;
}
function jointsHitPrinter(j) {
	const fk = forwardKinematics(j);
	for (const p of chainSamples(fk)) {
		const h = pointHitsPrinter(p);
		if (h) return h;
	}
	return null;
}
function jointsSegmentHits(a, b) {
	for (let i = 1; i < 16; i++) if (jointsHitPrinter(lerpJoints(a, b, i / 16))) return true;
	return false;
}
/** Extended pose in front of the printer — the only door in/out of the frame. */
var VIA_JOINTS = {
	base: 90,
	shoulder: 173,
	elbow: 8,
	wrist: 8,
	grip: 70
};
/** Folded over the base (z≈0) — intermediate before max park. */
var FOLD_JOINTS = {
	base: 90,
	shoulder: 120,
	elbow: 175,
	wrist: 170,
	grip: 40
};
/** Maximum retract: arm folded behind the base, opposite the printer. */
var PARK_JOINTS = {
	base: 90,
	shoulder: 175,
	elbow: 175,
	wrist: 168,
	grip: 40
};
function g(j, grip) {
	return {
		...j,
		grip
	};
}
var GRAPH_SEEDS = [
	VIA_JOINTS,
	{
		base: 40,
		shoulder: 173,
		elbow: 8,
		wrist: 8,
		grip: 70
	},
	{
		base: 55,
		shoulder: 173,
		elbow: 8,
		wrist: 8,
		grip: 70
	},
	{
		base: 125,
		shoulder: 173,
		elbow: 8,
		wrist: 8,
		grip: 70
	},
	{
		base: 140,
		shoulder: 173,
		elbow: 8,
		wrist: 8,
		grip: 70
	},
	{
		base: 40,
		shoulder: 150,
		elbow: 18,
		wrist: 28,
		grip: 70
	},
	{
		base: 55,
		shoulder: 150,
		elbow: 18,
		wrist: 28,
		grip: 70
	},
	{
		base: 125,
		shoulder: 150,
		elbow: 18,
		wrist: 28,
		grip: 70
	},
	{
		base: 140,
		shoulder: 150,
		elbow: 18,
		wrist: 28,
		grip: 70
	},
	{
		base: 90,
		shoulder: 155,
		elbow: 22,
		wrist: 22,
		grip: 70
	},
	{
		base: 36,
		shoulder: 145,
		elbow: 20,
		wrist: 35,
		grip: 70
	},
	{
		base: 144,
		shoulder: 145,
		elbow: 20,
		wrist: 35,
		grip: 70
	},
	FOLD_JOINTS,
	{
		base: 50,
		shoulder: 120,
		elbow: 175,
		wrist: 170,
		grip: 40
	},
	{
		base: 130,
		shoulder: 120,
		elbow: 175,
		wrist: 170,
		grip: 40
	},
	PARK_JOINTS,
	{
		base: 140,
		shoulder: 175,
		elbow: 175,
		wrist: 168,
		grip: 40
	},
	{
		base: 40,
		shoulder: 175,
		elbow: 175,
		wrist: 168,
		grip: 40
	},
	{
		base: 60,
		shoulder: 175,
		elbow: 175,
		wrist: 168,
		grip: 40
	},
	{
		base: 120,
		shoulder: 175,
		elbow: 175,
		wrist: 168,
		grip: 40
	}
];
function clearSeg(a, b) {
	if (jointsHitPrinter(b)) return false;
	return !jointsSegmentHits(a, b);
}
function samePose(a, b) {
	return maxJointError(a, b) < 3;
}
/** Collision-free joint-space path from a to b, inserting detours around the frame. */
function connectJoints(from, to) {
	const tgt = { ...to };
	if (jointsHitPrinter(tgt)) {
		const door = g(VIA_JOINTS, tgt.grip);
		return clearSeg(from, door) ? [door] : [];
	}
	if (clearSeg(from, tgt)) return [tgt];
	if (Math.abs(from.base - tgt.base) > 8) {
		const yawed = {
			...from,
			base: tgt.base
		};
		if (!jointsHitPrinter(yawed) && clearSeg(from, yawed) && clearSeg(yawed, tgt)) return [yawed, tgt];
		const yawDoor = g({
			...VIA_JOINTS,
			base: tgt.base
		}, tgt.grip);
		if (!jointsHitPrinter(yawDoor) && clearSeg(from, yawDoor) && clearSeg(yawDoor, tgt)) return samePose(from, yawDoor) ? [tgt] : [yawDoor, tgt];
	}
	const nodes = [
		from,
		tgt,
		{
			...from,
			base: tgt.base,
			grip: tgt.grip
		},
		{
			...tgt,
			base: from.base
		},
		g({
			...VIA_JOINTS,
			base: tgt.base
		}, tgt.grip),
		g({
			...VIA_JOINTS,
			base: from.base
		}, tgt.grip),
		...GRAPH_SEEDS.map((s) => g(s, tgt.grip))
	];
	const n = nodes.length;
	const adj = Array.from({ length: n }, () => []);
	for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++) if (clearSeg(nodes[i], nodes[k])) {
		adj[i].push(k);
		adj[k].push(i);
	}
	const prev = new Array(n).fill(-1);
	const q = [0];
	prev[0] = -2;
	for (let qi = 0; qi < q.length; qi++) {
		const i = q[qi];
		if (i === 1) break;
		for (const k of adj[i]) if (prev[k] === -1) {
			prev[k] = i;
			q.push(k);
		}
	}
	if (prev[1] !== -1) {
		const path = [];
		for (let i = 1; i !== 0; i = prev[i]) path.push(nodes[i]);
		path.reverse();
		return path.filter((p, idx) => idx === path.length - 1 || !samePose(p, idx ? path[idx - 1] : from));
	}
	const door = g(VIA_JOINTS, tgt.grip);
	const park = g(PARK_JOINTS, tgt.grip);
	if (clearSeg(from, door) && clearSeg(door, tgt)) return samePose(from, door) ? [tgt] : [door, tgt];
	if (clearSeg(from, door) && clearSeg(door, park) && clearSeg(park, door) && clearSeg(door, tgt)) return [
		door,
		park,
		door,
		tgt
	].filter((p, idx, arr) => idx === 0 || !samePose(p, arr[idx - 1]));
	return [];
}
function hazard(tcp, us) {
	if (tcp[1] < .007) return "sol";
	const hit = pointHitsPrinter(tcp);
	if (hit) return hit;
	if (us < 3.2) return "proximité";
	return null;
}
var BED = [
	PRINTER.origin[0],
	PRINTER.bedY + .012,
	PRINTER.origin[2] + .008
];
function seedParts() {
	const plaHome = [...BED];
	const petgHome = [
		BED[0] + .032,
		BED[1],
		BED[2] - .022
	];
	const failHome = [
		-.132,
		.016,
		.118
	];
	return [
		{
			id: "pla",
			kind: "pla",
			pos: [...plaHome],
			home: plaHome,
			held: false
		},
		{
			id: "petg",
			kind: "petg",
			pos: [...petgHome],
			home: petgHome,
			held: false
		},
		{
			id: "fail",
			kind: "fail",
			pos: [...failHome],
			home: failHome,
			held: false
		}
	];
}
function resetParts(parts) {
	for (const p of parts) {
		p.pos = [...p.home];
		p.held = false;
	}
}
function binFor(kind) {
	return KIND_META[kind].bin === "R" ? BIN_RIGHT : BIN_POS;
}
function wp(label, joints, holdMs = 280) {
	return {
		id: Math.random().toString(36).slice(2, 9),
		label,
		joints: { ...joints },
		holdMs
	};
}
function poseAt(p, grip) {
	return solveIK(p, grip);
}
function hoverY(p) {
	if (inPrinterColumn(p)) return Math.min(.128, Math.max(p[1] + .04, .118));
	return Math.max(p[1] + .052, .068);
}
function appendPose(wps, cur, next, label, hold) {
	const steps = connectJoints(cur, next);
	if (!steps.length) return cur;
	let last = cur;
	for (let i = 0; i < steps.length; i++) {
		const isLast = i === steps.length - 1;
		if (maxJointError(last, steps[i]) < 2.5 && !isLast) continue;
		wps.push(wp(isLast ? label : "Via", steps[i], isLast ? hold : 200));
		last = steps[i];
	}
	return last;
}
function followCart(wps, start, target, grip, label) {
	let cur = start;
	const fromTcp = forwardKinematics(cur).tcp;
	const fromIn = inPrinterColumn(fromTcp);
	const toIn = inPrinterColumn(target);
	if (fromIn !== toIn) cur = appendPose(wps, cur, {
		...VIA_JOINTS,
		grip
	}, "Seuil", 220);
	if (toIn) {
		const over = [
			target[0],
			hoverY(target),
			target[2]
		];
		cur = appendPose(wps, cur, poseAt(over, grip), `${label} survol`, 240);
	}
	return appendPose(wps, cur, poseAt(target, grip), label, 300);
}
/** Approach → pinch → lift → transit around the printer → drop. */
function pickAndPlace(from, to, tag, start = HOME_JOINTS) {
	const open = 82;
	const shut = 6;
	const hoverFrom = [
		from[0],
		hoverY(from),
		from[2]
	];
	const pick = [
		from[0],
		from[1] + .008,
		from[2]
	];
	const lift = [
		from[0],
		hoverY(from) + .01,
		from[2]
	];
	const hoverTo = [
		to[0],
		hoverY(to),
		to[2]
	];
	const drop = [
		to[0],
		to[1] + .022,
		to[2]
	];
	const wps = [];
	let cur = start;
	cur = followCart(wps, cur, hoverFrom, open, `${tag} approche`);
	cur = appendPose(wps, cur, poseAt(pick, open), `${tag} descente`, 400);
	cur = appendPose(wps, cur, poseAt(pick, shut), `${tag} prise`, 520);
	cur = appendPose(wps, cur, poseAt(lift, shut), `${tag} extract`, 320);
	cur = followCart(wps, cur, hoverTo, shut, `${tag} transit`);
	cur = appendPose(wps, cur, poseAt(drop, shut), `${tag} dépôt`, 360);
	cur = appendPose(wps, cur, poseAt(drop, 84), `${tag} relâche`, 280);
	appendPose(wps, cur, poseAt(hoverTo, 84), `${tag} dégage`, 200);
	return wps;
}
function grabPath(part, start) {
	const open = 84;
	const shut = 6;
	const tag = KIND_META[part.kind].label;
	const hover = [
		part.pos[0],
		hoverY(part.pos),
		part.pos[2]
	];
	const pick = [
		part.pos[0],
		part.pos[1] + .008,
		part.pos[2]
	];
	const lift = [
		part.pos[0],
		hoverY(part.pos) + .012,
		part.pos[2]
	];
	const wps = [];
	let cur = start;
	cur = followCart(wps, cur, hover, open, `${tag} approche`);
	cur = appendPose(wps, cur, poseAt(pick, open), `${tag} descente`, 420);
	cur = appendPose(wps, cur, poseAt(pick, shut), `${tag} prise`, 560);
	appendPose(wps, cur, poseAt(lift, shut), `${tag} extract`, 320);
	return wps;
}
function inspectPath(parts, start = HOME_JOINTS) {
	const open = 72;
	const wps = [wp("Prêt", start, 120)];
	let cur = start;
	for (const p of parts) {
		const hover = [
			p.pos[0],
			hoverY(p.pos),
			p.pos[2]
		];
		cur = followCart(wps, cur, hover, open, `Cadre ${KIND_META[p.kind].label}`);
	}
	appendPose(wps, cur, HOME_JOINTS, "Home", 200);
	return wps;
}
function colorSortPath(parts, start = HOME_JOINTS) {
	const queue = parts.filter((p) => !p.held);
	const wps = [wp("Prêt", start, 100)];
	let cur = start;
	for (const p of queue) {
		const chunk = pickAndPlace(p.pos, binFor(p.kind), KIND_META[p.kind].label, cur);
		wps.push(...chunk);
		cur = chunk[chunk.length - 1]?.joints ?? cur;
	}
	appendPose(wps, cur, HOME_JOINTS, "Home", 200);
	return wps;
}
function pickupPath(parts, start = HOME_JOINTS) {
	const pla = parts.find((p) => p.kind === "pla") ?? parts[0];
	if (!pla) return [wp("Home", HOME_JOINTS, 200)];
	const wps = [wp("Prêt", start, 120), ...pickAndPlace(pla.pos, BIN_POS, "Pièce", start)];
	appendPose(wps, wps[wps.length - 1]?.joints ?? start, HOME_JOINTS, "Home", 180);
	return wps;
}
function parkPath(start) {
	const wps = [];
	const tcp = forwardKinematics(start).tcp;
	let cur = start;
	if (inPrinterColumn(tcp)) {
		const above = [
			tcp[0],
			hoverY(tcp),
			tcp[2]
		];
		cur = appendPose(wps, cur, poseAt(above, start.grip), "Dégage plateau", 280);
	}
	cur = appendPose(wps, cur, {
		...VIA_JOINTS,
		grip: 48
	}, "Seuil", 240);
	cur = appendPose(wps, cur, {
		base: 140,
		shoulder: 173,
		elbow: 8,
		wrist: 8,
		grip: 40
	}, "Côté", 280);
	cur = appendPose(wps, cur, {
		base: 140,
		shoulder: 175,
		elbow: 175,
		wrist: 168,
		grip: 40
	}, "Repli", 420);
	appendPose(wps, cur, {
		...PARK_JOINTS,
		grip: 40
	}, "Park", 380);
	return wps;
}
function homePath(start) {
	const wps = [];
	appendPose(wps, start, {
		...HOME_JOINTS,
		grip: start.grip
	}, "Home", 280);
	return wps;
}
function nearestPart(parts, tcp, max = .05) {
	let best = null;
	let d = max;
	for (const p of parts) {
		if (p.held) continue;
		const k = Math.hypot(p.pos[0] - tcp[0], p.pos[1] - tcp[1], p.pos[2] - tcp[2]);
		if (k < d) {
			d = k;
			best = p;
		}
	}
	return best;
}
function grabPoint(fk) {
	return [
		fk.tcp[0] + fk.toolDir[0] * .022,
		fk.tcp[1] + fk.toolDir[1] * .022,
		fk.tcp[2] + fk.toolDir[2] * .022
	];
}
function gotoPath(start, target) {
	const wps = [];
	followCart(wps, start, target, start.grip, "Goto");
	return wps;
}
function stitchPath(start, raw) {
	const wps = [];
	let cur = start;
	for (const w of raw) cur = appendPose(wps, cur, w.joints, w.label, w.holdMs);
	return wps;
}
var n = 0;
function w(label, joints, holdMs = 280) {
	n += 1;
	return {
		id: `w${n}`,
		label,
		joints: { ...joints },
		holdMs
	};
}
var aboveBed = inverseKinematics([
	PRINTER.origin[0],
	PRINTER.bedY + .055,
	PRINTER.origin[2] + .01
], 78) ?? HOME_JOINTS;
var onBed = inverseKinematics([
	PRINTER.origin[0],
	PRINTER.bedY + .02,
	PRINTER.origin[2] + .01
], 78) ?? HOME_JOINTS;
var pinchBed = {
	...onBed,
	grip: 8
};
var MISSIONS = [
	{
		id: "pickup",
		title: "Fin d'impression",
		blurb: "Sort du cadre, prend la pièce PLA, dépose dans le bac gauche.",
		waypoints: [w("Repos", HOME_JOINTS, 200)]
	},
	{
		id: "color",
		title: "Triage couleur",
		blurb: "PLA → gauche, PETG → droite, rejet au sol → gauche. Contourne le cadre.",
		waypoints: [w("Home", HOME_JOINTS, 180)]
	},
	{
		id: "inspect",
		title: "Inspection",
		blurb: "Survole chaque objet sans rentrer dans le portique.",
		waypoints: [w("Home", HOME_JOINTS, 180)]
	},
	{
		id: "hold",
		title: "Maintien",
		blurb: "Ferme la pince et fige le bras pour tenir une pièce.",
		waypoints: [
			w("Approche", aboveBed, 300),
			w("Contact", onBed, 360),
			w("Maintien", {
				...pinchBed,
				grip: 12
			}, 0)
		]
	},
	{
		id: "scan",
		title: "Balayage ultrason",
		blurb: "Balaye devant le plateau — jamais dans les montants.",
		waypoints: [
			w("Gauche", inverseKinematics([
				-.1,
				.11,
				.12
			], 70) ?? HOME_JOINTS, 240),
			w("Seuil", inverseKinematics([
				.02,
				.11,
				.12
			], 70) ?? HOME_JOINTS, 240),
			w("Droite", inverseKinematics([
				.1,
				.11,
				.12
			], 70) ?? HOME_JOINTS, 240),
			w("Home", HOME_JOINTS, 200)
		]
	},
	{
		id: "wave",
		title: "Salut",
		blurb: "Séquence de démo — vérifie les cinq servos, hors du volume d'impression.",
		waypoints: [
			w("Home", HOME_JOINTS, 200),
			w("Coucou 1", {
				base: 128,
				shoulder: 173,
				elbow: 8,
				wrist: 8,
				grip: 82
			}, 280),
			w("Coucou 2", {
				base: 128,
				shoulder: 173,
				elbow: 8,
				wrist: 42,
				grip: 16
			}, 280),
			w("Coucou 3", {
				base: 128,
				shoulder: 173,
				elbow: 8,
				wrist: 8,
				grip: 82
			}, 280),
			w("Ouvert", {
				...HOME_JOINTS,
				grip: 88
			}, 200),
			w("Home", HOME_JOINTS, 200)
		]
	},
	{
		id: "park",
		title: "Parking",
		blurb: "Dégage le plateau, se replie derrière la base — hors du cadre, au maximum.",
		waypoints: [w("Park", PARK_JOINTS, 500)]
	}
];
function missionById(id) {
	return MISSIONS.find((m) => m.id === id) ?? null;
}
function waypointsFor(id, parts, start) {
	if (id === "color") return colorSortPath(parts, start);
	if (id === "inspect") return inspectPath(parts, start);
	if (id === "pickup") return pickupPath(parts, start);
	if (id === "park") return parkPath(start);
	return stitchPath(start, missionById(id)?.waypoints ?? []);
}
var NUM_WORDS = {
	zero: 0,
	un: 1,
	une: 1,
	deux: 2,
	trois: 3,
	quatre: 4,
	cinq: 5,
	six: 6,
	sept: 7,
	huit: 8,
	neuf: 9,
	dix: 10,
	quinze: 15,
	vingt: 20,
	trente: 30,
	quarante: 40,
	cinquante: 50,
	soixante: 60,
	"soixante-dix": 70,
	"quatre-vingt": 80,
	"quatre-vingts": 80,
	"quatre-vingt-dix": 90,
	quatrevingt: 80,
	cent: 100
};
function fold(s) {
	return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^a-z0-9%.\s-]/g, " ").replace(/\s+/g, " ").trim();
}
function magnitude(t) {
	if (/\ba fond\b|\bau max\b|\btotalement\b|\bcompletement\b|\bfull\b/.test(t)) return 90;
	if (/\bbeaucoup\b|\bgrand\b|\bfort\b|\blarge\b/.test(t)) return 28;
	if (/\bun petit peu\b|\btres peu\b|\bdoucement\b|\blegerement\b/.test(t)) return 6;
	if (/\bun peu\b|\blegerement\b|\bun chouia\b/.test(t)) return 10;
	return 16;
}
function parseNumber(t) {
	const m = t.match(/(-?\d+(?:[.,]\d+)?)/);
	if (m) return Number(m[1].replace(",", "."));
	for (const [w, n] of Object.entries(NUM_WORDS)) if (t.includes(w)) return n;
	return null;
}
function jointFrom(t) {
	if (/\bpince\b|\bgriffe\b|\bgripper\b|\bmachoire/.test(t)) return "grip";
	if (/\bpoignet\b|\bwrist\b|\bmain\b|\binclin/.test(t)) return "wrist";
	if (/\bcoude\b|\belbow\b/.test(t)) return "elbow";
	if (/\bepaule\b|\bshoulder\b|\bbras\b/.test(t)) return "shoulder";
	if (/\bbase\b|\bsocle\b|\btourner\b|\brotation\b|\byaw\b/.test(t)) return "base";
	return null;
}
function deltaMeters(t, mag) {
	const cm = t.match(/(-?\d+(?:[.,]\d+)?)\s*cm/);
	if (cm) return Number(cm[1].replace(",", ".")) * .01;
	const mm = t.match(/(-?\d+(?:[.,]\d+)?)\s*mm/);
	if (mm) return Number(mm[1].replace(",", ".")) * .001;
	return mag * .0014;
}
var MISSION_ALIASES = [
	{
		id: "color",
		re: /\b(trie par couleur|triage couleur|classe les pieces|trie tout|couleur)\b/
	},
	{
		id: "pickup",
		re: /\b(enleve|decolle|retire|ramasse|prend|attrape|recupere).*(piece|impression|print|cube|objet)|fin d.?impression|print done|decharge/
	},
	{
		id: "inspect",
		re: /\b(inspecte|inspection|photo|cadre)\b/
	},
	{
		id: "hold",
		re: /\b(maintien|maintiens|tiens|hold|serre et tiens)\b/
	},
	{
		id: "scan",
		re: /\b(scan|balaye|ultrason|mesure)\b/
	},
	{
		id: "wave",
		re: /\b(salue|bonjour|demo|vague|wave)\b/
	},
	{
		id: "park",
		re: /\b(park|garage|range le bras|repli)\b/
	}
];
var VOICE_EXAMPLES = [
	"ouvre la pince",
	"ferme la pince",
	"trie par couleur",
	"enlève la pièce",
	"inspecte",
	"va au plateau",
	"2 cm à gauche",
	"vise la pièce",
	"attrape",
	"montre l'œil",
	"home",
	"stop",
	"plus vite",
	"épaule 100 degrés",
	"enregistre",
	"rejoue"
];
function parseVoice(raw) {
	const t = fold(raw);
	if (!t || t.length < 2) return null;
	if (/\b(stop|arret|arrete|halte|freeze|pause|immobil)\b/.test(t)) return { kind: "stop" };
	if (/\b(oeil|camera|vision)\b/.test(t) || /montre l.?oeil|montre la camera/.test(t)) return { kind: "eye" };
	if (/\b(repose|replace|reset piece|nouvelle piece|remet la piece|reinitialise)\b/.test(t)) return { kind: "reset" };
	if (/\b(vise|regarde la piece|pointe la piece|look)\b/.test(t)) return { kind: "look" };
	if (/\b(attrape|agrippe|grab|prends ca)\b/.test(t) && !/\bimpression\b/.test(t)) return { kind: "grab" };
	if (/\b(aide|help|commandes|que dire)\b/.test(t)) return { kind: "help" };
	if (/\b(home|repos|origine|neutre|position initiale)\b/.test(t) && !/\bpiece\b/.test(t)) return { kind: "home" };
	if (/\b(enregistre|sauvegarde|waypoint|capture la position)\b/.test(t)) return { kind: "record" };
	if (/\b(rejoue|joue|execute|lance la sequence|replay)\b/.test(t)) return { kind: "play" };
	if (/\b(efface|vide la sequence|clear)\b/.test(t)) return { kind: "clear" };
	if (/\b(va au plateau|vers le plateau|au lit|sur le bed)\b/.test(t)) return {
		kind: "goto",
		place: "bed"
	};
	if (/\b(bac gauche|bin gauche|a gauche le bac)\b/.test(t)) return {
		kind: "goto",
		place: "binL"
	};
	if (/\b(bac droit|bin droit)\b/.test(t)) return {
		kind: "goto",
		place: "binR"
	};
	if (/\bplus vite\b|\baccelere\b|\bfaster\b/.test(t)) return {
		kind: "speed",
		value: 1
	};
	if (/\bplus lent\b|\bralenti\b|\bdoucement\b|\bslower\b/.test(t) && !jointFrom(t)) return {
		kind: "speed",
		value: .35
	};
	if (/\bvitesse/.test(t)) {
		const n = parseNumber(t);
		if (n != null) return {
			kind: "speed",
			value: n > 1 ? n / 100 : n
		};
	}
	for (const m of MISSION_ALIASES) if (m.re.test(t)) return {
		kind: "mission",
		id: m.id
	};
	if (/\b(ouvre|open)\b/.test(t) && (/\bpince\b|\bgriffe\b|$/.test(t) || !jointFrom(t))) {
		if (!/\bcoude\b|\bepaule\b|\bpoignet\b/.test(t)) {
			const n = parseNumber(t);
			if (n != null && t.includes("degre")) return {
				kind: "set",
				joint: "grip",
				value: n
			};
			return {
				kind: "set",
				joint: "grip",
				value: t.includes("un peu") ? 55 : 88
			};
		}
	}
	if (/\b(ferme|close|serre)\b/.test(t) && !/\bcoude\b/.test(t)) return {
		kind: "set",
		joint: "grip",
		value: t.includes("un peu") ? 28 : 4
	};
	const joint = jointFrom(t);
	const numbered = parseNumber(t);
	if (joint && numbered != null && /\bdegre|%|pour ?cent|a \d/.test(t)) {
		if (joint === "grip" && (t.includes("%") || t.includes("pourcent"))) return {
			kind: "set",
			joint,
			value: numbered / 100 * 90
		};
		return {
			kind: "set",
			joint,
			value: numbered
		};
	}
	if (joint && numbered != null && t.split(" ").length <= 4) return {
		kind: "set",
		joint,
		value: numbered
	};
	const mag = magnitude(t);
	const meters = deltaMeters(t, mag);
	if (/\b(avance|forward|approche)\b/.test(t)) return {
		kind: "cartesian",
		axis: "z",
		delta: meters
	};
	if (/\b(recule|arriere|eloigne|back)\b/.test(t)) return {
		kind: "cartesian",
		axis: "z",
		delta: -meters
	};
	if (/\b(va a gauche|a gauche|translata?e gauche|slide left)\b/.test(t) || /\bgauche\b/.test(t) && !/\bbase\b|\btourne\b|\brotation\b|\bbac\b/.test(t)) {
		if (!/\btourne\b|\bpivot\b|\bbase\b/.test(t)) return {
			kind: "cartesian",
			axis: "x",
			delta: -meters
		};
	}
	if (/\b(va a droite|a droite|slide right)\b/.test(t) || /\bdroite\b/.test(t) && !/\btourne\b|\bbase\b|\bbac\b/.test(t)) return {
		kind: "cartesian",
		axis: "x",
		delta: meters
	};
	if (/\b(monte|leve|higher|up)\b/.test(t) && !/\bepaule\b|\bbas\b/.test(t)) {
		if (/\bpince\b|\boutil\b|\bcartesien\b|\bout\b/.test(t) || !/\bbras\b|\bepaule\b/.test(t)) {
			if (/\bpince\b|\boutil\b|\bpointe\b/.test(t) || /\bmonte\b/.test(t)) return {
				kind: "cartesian",
				axis: "y",
				delta: meters
			};
		}
	}
	if (/\b(descend|baisse|lower|down)\b/.test(t) && /\bpince\b|\boutil\b|\bpointe\b/.test(t)) return {
		kind: "cartesian",
		axis: "y",
		delta: -meters
	};
	if (/\b(tourne|pivot|rotation|base)\b/.test(t) || /\bgauche\b|\bdroite\b/.test(t) && /\bbas(e)?\b/.test(t)) return {
		kind: "nudge",
		joint: "base",
		delta: (/\bdroite\b|\bright\b/.test(t) ? 1 : -1) * mag
	};
	if (/\b(leve le bras|baisse le bras|epaule|shoulder)\b/.test(t) || /\bleve\b|\bbaisse\b/.test(t) && !/\bcoude\b|\bpoignet\b|\bpince\b/.test(t)) return {
		kind: "nudge",
		joint: "shoulder",
		delta: (/\bbaisse\b|\bdescend\b/.test(t) ? -1 : 1) * mag
	};
	if (/\bcoude\b|\belbow\b/.test(t)) return {
		kind: "nudge",
		joint: "elbow",
		delta: (/\b(moins|ferme|plie|repli)\b/.test(t) ? -1 : 1) * mag
	};
	if (/\bpoignet\b|\bwrist\b|\bincline\b/.test(t)) return {
		kind: "nudge",
		joint: "wrist",
		delta: (/\b(bas|baisse|descend)\b/.test(t) ? -1 : 1) * mag
	};
	if (/\bpince\b/.test(t) && /\b(plus|moins|ouvre|ferme)\b/.test(t)) return {
		kind: "nudge",
		joint: "grip",
		delta: (/\bferme\b|\bmoins\b/.test(t) ? -1 : 1) * mag
	};
	if (/\b(gauche)\b/.test(t)) return {
		kind: "nudge",
		joint: "base",
		delta: -mag
	};
	if (/\b(droite)\b/.test(t)) return {
		kind: "nudge",
		joint: "base",
		delta: mag
	};
	if (/\b(monte|leve)\b/.test(t)) return {
		kind: "cartesian",
		axis: "y",
		delta: meters
	};
	if (/\b(descend|baisse)\b/.test(t)) return {
		kind: "cartesian",
		axis: "y",
		delta: -meters
	};
	if (t.length >= 12) return {
		kind: "ai",
		text: raw.trim()
	};
	return null;
}
function describeCommand(cmd) {
	switch (cmd.kind) {
		case "nudge": return `${cmd.joint} ${cmd.delta > 0 ? "+" : ""}${Math.round(cmd.delta)}°`;
		case "set": return `${cmd.joint} → ${Math.round(cmd.value)}°`;
		case "cartesian": return `outil ${cmd.axis} ${cmd.delta > 0 ? "+" : ""}${(cmd.delta * 1e3).toFixed(0)} mm`;
		case "stop": return "arrêt";
		case "speed": return `vitesse ${Math.round(cmd.value * 100)}%`;
		case "mission": return `mission ${cmd.id}`;
		case "home": return "position home";
		case "record": return "waypoint enregistré";
		case "play": return "lecture séquence";
		case "clear": return "séquence effacée";
		case "help": return "commandes vocales";
		case "eye": return "œil ESP32-CAM";
		case "look": return "viser la pièce";
		case "reset": return "atelier réinitialisé";
		case "goto": return `goto ${cmd.place}`;
		case "grab": return "prise automatique";
		case "ai": return "planification";
	}
}
var visual = {
	current: { ...HOME_JOINTS },
	parts: seedParts(),
	heldId: null,
	ultrasonic: 18,
	tcp: [
		0,
		.1,
		.15
	],
	hazard: null,
	reach: .55
};
function uid() {
	return Math.random().toString(36).slice(2, 9);
}
var holdLeft = 0;
var uiAcc = 0;
var socket = null;
var segT = 0;
var segDur = .3;
var segFrom = { ...HOME_JOINTS };
var segTo = { ...HOME_JOINTS };
var inSeg = false;
function sendPose(joints) {
	if (!socket || socket.readyState !== WebSocket.OPEN) return;
	const { target, speed } = useArm.getState();
	socket.send(JSON.stringify({
		t: "pose",
		j: joints ?? target,
		spd: speed
	}));
}
function startSeg(from, to, speed, holdMs) {
	segFrom = { ...from };
	segTo = { ...to };
	segDur = durationFor(from, to, speed);
	segT = 0;
	holdLeft = holdMs / 1e3;
	inSeg = true;
}
function playList(list, missionId, speed) {
	if (!list.length) return;
	holdLeft = 0;
	startSeg(visual.current, list[0].joints, speed, list[0].holdMs);
	useArm.setState({
		playMode: "mission",
		missionId,
		playIndex: 0,
		target: { ...list[0].joints },
		activeWaypoints: list
	});
}
function floorFor(p) {
	const overLeft = dist(p.pos, BIN_POS) < .048;
	const overRight = dist(p.pos, BIN_RIGHT) < .048;
	const overBed = p.pos[2] > .14 && Math.abs(p.pos[0] - PRINTER.origin[0]) < .07;
	if (overLeft || overRight) return .02;
	if (overBed) return PRINTER.bedY + .012;
	return .012;
}
var useArm = create()(persist((set, get) => ({
	target: { ...HOME_JOINTS },
	speed: .62,
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
	log: (kind, text) => set((s) => ({ logs: [{
		id: uid(),
		at: Date.now(),
		kind,
		text
	}, ...s.logs].slice(0, 48) })),
	nudge: (joint, delta) => {
		set({
			target: clampJoints({
				...get().target,
				[joint]: get().target[joint] + delta
			}),
			playMode: "idle",
			missionId: null
		});
		inSeg = false;
	},
	setJoint: (joint, value) => {
		set({
			target: clampJoints({
				...get().target,
				[joint]: value
			}),
			playMode: "idle",
			missionId: null
		});
		inSeg = false;
	},
	setTarget: (joints) => {
		set({
			target: clampJoints(joints),
			playMode: "idle",
			missionId: null
		});
		inSeg = false;
	},
	setSpeed: (v) => set({ speed: Math.max(.15, Math.min(1, v)) }),
	goHome: () => {
		const list = homePath(visual.current);
		if (!list.length) {
			inSeg = false;
			set({
				target: { ...HOME_JOINTS },
				playMode: "idle",
				missionId: null
			});
			return;
		}
		playList(list, "home", get().speed);
	},
	stop: () => {
		inSeg = false;
		holdLeft = 0;
		set({
			target: { ...visual.current },
			playMode: "idle",
			missionId: null
		});
	},
	setListening: (listening) => set({ listening }),
	setTranscript: (transcript, final) => {
		if (final) set({
			transcript,
			lastHeard: transcript
		});
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
		const mm = get().jogStep * sign * .001;
		set({
			target: nudgeCartesian(get().target, axis, mm),
			playMode: "idle",
			missionId: null
		});
		inSeg = false;
	},
	goToPoint: (p) => {
		const s = get();
		const hover = [
			p[0],
			Math.max(p[1], .022) + .012,
			p[2]
		];
		const list = gotoPath(visual.current, hover);
		if (!list.length) {
			s.setTarget(lookAt(s.target, hover, s.target.grip));
			return;
		}
		playList(list, "goto", s.speed);
		s.log("system", `Goto ${Math.round(p[0] * 1e3)} ${Math.round(p[1] * 1e3)} ${Math.round(p[2] * 1e3)} mm`);
	},
	lookAtPart: () => {
		const s = get();
		const focused = visual.parts.find((p) => p.id === s.focusId) ?? visual.parts[0];
		if (!focused) return;
		const p = focused.pos;
		s.setTarget(lookAt(s.target, [
			p[0],
			p[1] + .05,
			p[2]
		], s.target.grip));
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
			s.setTarget(lookAt(s.target, [
				n.pos[0],
				n.pos[1] + .008,
				n.pos[2]
			], 8));
			s.log("system", `Prise ${n.kind.toUpperCase()}`);
			return;
		}
		playList(list, "grab", s.speed);
		s.log("system", `Prise ${n.kind.toUpperCase()}`);
	},
	grabNearest: () => {
		const s = get();
		const n = visual.parts.find((p) => p.id === s.focusId && !p.held) ?? nearestPart(visual.parts, visual.tcp, .28) ?? visual.parts.find((p) => !p.held) ?? null;
		if (!n) {
			s.log("system", "Aucune pièce");
			return;
		}
		s.grabPart(n.id);
	},
	disconnectLive: () => {
		socket?.close();
		socket = null;
		set({
			connected: false,
			connecting: false
		});
	},
	connectLive: () => {
		const url = get().liveUrl;
		socket?.close();
		set({ connecting: true });
		try {
			const ws = new WebSocket(url);
			socket = ws;
			ws.onopen = () => {
				set({
					connected: true,
					connecting: false
				});
				get().log("system", "T-Display S3 en ligne");
				sendPose();
			};
			ws.onclose = () => {
				if (socket === ws) {
					socket = null;
					set({
						connected: false,
						connecting: false
					});
				}
			};
			ws.onerror = () => {
				get().log("system", "Carte injoignable — simulateur actif");
				set({
					connecting: false,
					connected: false
				});
			};
		} catch {
			set({
				connecting: false,
				connected: false
			});
			get().log("system", "WebSocket refusé par le navigateur");
		}
	},
	recordWaypoint: (label) => {
		const { target, sequence } = get();
		const wp = {
			id: uid(),
			label: label ?? `P${sequence.length + 1}`,
			joints: { ...target },
			holdMs: 320
		};
		set({ sequence: [...sequence, wp] });
		get().log("system", `Waypoint ${wp.label} mémorisé`);
	},
	removeWaypoint: (id) => set((s) => ({ sequence: s.sequence.filter((w) => w.id !== id) })),
	clearSequence: () => set({
		sequence: [],
		playMode: "idle"
	}),
	playSequence: () => {
		const { sequence, speed } = get();
		if (!sequence.length) return;
		holdLeft = 0;
		startSeg(visual.current, sequence[0].joints, speed, sequence[0].holdMs);
		set({
			playMode: "sequence",
			playIndex: 0,
			target: { ...sequence[0].joints },
			activeWaypoints: sequence
		});
		get().log("mission", "Lecture de la séquence");
	},
	playMission: (id) => {
		const m = missionById(id);
		if (!m) return;
		if (id === "color" || id === "pickup") {
			if (visual.parts.every((p) => dist(p.pos, BIN_POS) < .05 || dist(p.pos, BIN_RIGHT) < .05)) resetParts(visual.parts);
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
					missionId: null
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
				set({
					helpOpen: true,
					panel: "voix"
				});
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
				const dest = {
					bed: [
						PRINTER.origin[0],
						PRINTER.bedY + .05,
						PRINTER.origin[2]
					],
					binL: [
						BIN_POS[0],
						.08,
						BIN_POS[2]
					],
					binR: [
						BIN_RIGHT[0],
						.08,
						BIN_RIGHT[2]
					]
				};
				s.goToPoint(dest[cmd.place]);
				break;
			}
			case "grab": s.grabNearest();
		}
	},
	tick: (dt) => {
		const s = get();
		const c = visual.current;
		if (s.playMode !== "idle" && inSeg) {
			segT += dt / Math.max(.05, segDur);
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
		if (!visual.heldId && gap < .028 && c.grip < 42) {
			const focused = visual.parts.find((p) => p.id === s.focusId && !p.held);
			let hit = nearestPart(visual.parts, tip, .062) ?? nearestPart(visual.parts, fk.tcp, .055);
			if (!hit && focused) {
				if (dist(tip, focused.pos) < .095) hit = focused;
			}
			if (hit) {
				hit.held = true;
				visual.heldId = hit.id;
			}
		}
		for (const p of visual.parts) if (p.id === visual.heldId) {
			p.pos[0] = tip[0];
			p.pos[1] = tip[1];
			p.pos[2] = tip[2];
			if (gap > .03) {
				p.held = false;
				visual.heldId = null;
				p.pos[1] = Math.max(.012, tip[1]);
			}
		} else {
			const floor = floorFor(p);
			if (p.pos[1] > floor) p.pos[1] = Math.max(floor, p.pos[1] - .55 * dt);
			if (dist(p.pos, BIN_POS) < .048 && p.pos[1] <= .025) {
				p.pos[0] = BIN_POS[0];
				p.pos[2] = BIN_POS[2];
			}
			if (dist(p.pos, BIN_RIGHT) < .048 && p.pos[1] <= .025) {
				p.pos[0] = BIN_RIGHT[0];
				p.pos[2] = BIN_RIGHT[2];
			}
		}
		visual.ultrasonic = simulateUltrasonic(fk.tcp, fk.toolDir, visual.parts.map((p) => p.pos), Boolean(visual.heldId));
		visual.hazard = hazard(fk.tcp, visual.ultrasonic);
		visual.reach = reachRatio(fk.tcp);
		let playMode = s.playMode;
		let playIndex = s.playIndex;
		let target = s.target;
		let missionId = s.missionId;
		let playChanged = false;
		const list = s.activeWaypoints;
		if (playMode !== "idle") {
			if (!list[playIndex]) {
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
		if (playChanged || uiAcc > .1) {
			uiAcc = 0;
			const patch = {
				ultrasonic: visual.ultrasonic,
				held: Boolean(visual.heldId)
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
	}
}), {
	name: "pince-v3",
	partialize: (s) => ({
		sequence: s.sequence,
		liveUrl: s.liveUrl,
		speed: s.speed,
		camUrl: s.camUrl,
		jogMode: s.jogMode,
		jogStep: s.jogStep
	})
}));
useArm.subscribe((s, prev) => {
	if (s.target !== prev.target || s.speed !== prev.speed) sendPose();
});
var D2R = Math.PI / 180;
var viewApi = { reset: () => {} };
function useMat() {
	return (0, import_react.useMemo)(() => ({
		pla: {
			color: "#32362e",
			roughness: .74,
			metalness: .05
		},
		plaLight: {
			color: "#42483e",
			roughness: .68,
			metalness: .06
		},
		servo: {
			color: "#141414",
			roughness: .34,
			metalness: .32
		},
		horn: {
			color: "#c8ccc4",
			roughness: .28,
			metalness: .66
		},
		steel: {
			color: "#7a818c",
			roughness: .22,
			metalness: .78
		},
		ink: {
			color: "#101210",
			roughness: .86,
			metalness: .04
		},
		part: {
			color: "#d9d0bf",
			roughness: .52,
			metalness: .04
		},
		pad: {
			color: "#6e7478",
			roughness: .55,
			metalness: .08
		},
		table: {
			color: "#161814",
			roughness: .9,
			metalness: .02
		},
		cam: {
			color: "#1c1e18",
			roughness: .4,
			metalness: .2
		}
	}), []);
}
function Servo({ m, scale = 1 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		scale,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.023,
					.022,
					.0124
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.servo })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					-.012,
					0
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.032,
					.0026,
					.0124
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.servo })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.006,
					.014,
					0
				],
				rotation: [
					Math.PI / 2,
					0,
					0
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.0058,
					.0058,
					.005,
					16
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.horn })]
			})
		]
	});
}
function Link({ m, length, wide = .016 }) {
	const r = wide / 2;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				0,
				length / 2
			],
			rotation: [
				Math.PI / 2,
				0,
				0
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				r * .92,
				r,
				length,
				12
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pla })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				0,
				0
			],
			rotation: [
				Math.PI / 2,
				0,
				0
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				r * 1.15,
				r * 1.15,
				.01,
				14
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.plaLight })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				0,
				length
			],
			rotation: [
				Math.PI / 2,
				0,
				0
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				r * .95,
				r * .95,
				.01,
				14
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.plaLight })]
		})
	] });
}
function Ticker() {
	useFrame((_, dt) => {
		useArm.getState().tick(Math.min(dt, .1));
	});
	return null;
}
function ArmRig({ m }) {
	const base = (0, import_react.useRef)(null);
	const shoulder = (0, import_react.useRef)(null);
	const elbow = (0, import_react.useRef)(null);
	const wrist = (0, import_react.useRef)(null);
	const jawL = (0, import_react.useRef)(null);
	const jawR = (0, import_react.useRef)(null);
	const { l1, l2, l3 } = ARM_DIM;
	useFrame(() => {
		const j = visual.current;
		if (base.current) base.current.rotation.y = (j.base - 90) * D2R;
		if (shoulder.current) shoulder.current.rotation.x = (90 - j.shoulder) * D2R;
		if (elbow.current) elbow.current.rotation.x = (90 - j.elbow) * D2R;
		if (wrist.current) wrist.current.rotation.x = (90 - j.wrist) * D2R;
		const open = .002 + j.grip / 90 * .016;
		if (jawL.current) jawL.current.position.x = -open - .007;
		if (jawR.current) jawR.current.position.x = open + .007;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				.005,
				0
			],
			receiveShadow: true,
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				.048,
				.052,
				.01,
				28
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pla })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				.016,
				0
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				.026,
				.03,
				.016,
				24
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.plaLight })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			ref: base,
			position: [
				0,
				.026,
				0
			],
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Servo, { m }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						.012,
						0
					],
					castShadow: true,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
						.018,
						.02,
						.012,
						20
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pla })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
					ref: shoulder,
					position: [
						0,
						.016,
						0
					],
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
							rotation: [
								0,
								0,
								Math.PI / 2
							],
							position: [
								-.014,
								0,
								0
							],
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Servo, { m })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							m,
							length: l1
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
							ref: elbow,
							position: [
								0,
								0,
								l1
							],
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
									rotation: [
										0,
										0,
										Math.PI / 2
									],
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Servo, { m })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									m,
									length: l2,
									wide: .014
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
									ref: wrist,
									position: [
										0,
										0,
										l2
									],
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Servo, {
											m,
											scale: .82
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
											position: [
												0,
												0,
												.01
											],
											castShadow: true,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
												.022,
												.016,
												.024
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pla })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
											position: [
												0,
												0,
												l3 - .01
											],
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
													castShadow: true,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
														.028,
														.016,
														.022
													] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.plaLight })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
													position: [
														0,
														.01,
														-.004
													],
													rotation: [
														Math.PI / 2,
														0,
														0
													],
													castShadow: true,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
														.004,
														.004,
														.01,
														10
													] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pad })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
													position: [
														.007,
														.01,
														-.004
													],
													rotation: [
														Math.PI / 2,
														0,
														0
													],
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
														.003,
														.003,
														.008,
														8
													] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.horn })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
													ref: jawL,
													position: [
														-.01,
														0,
														.016
													],
													castShadow: true,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
														.005,
														.014,
														.038
													] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pad })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
													ref: jawR,
													position: [
														.01,
														0,
														.016
													],
													castShadow: true,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
														.005,
														.014,
														.038
													] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pad })]
												})
											]
										})
									]
								})
							]
						})
					]
				})
			]
		})
	] });
}
function Printer({ m }) {
	const o = PRINTER.origin;
	const s = PRINTER.bedSize;
	const down = (0, import_react.useRef)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		position: [
			o[0],
			0,
			o[2]
		],
		children: [
			[
				[-s / 2, s / 2],
				[s / 2, s / 2],
				[-s / 2, -s / 2],
				[s / 2, -s / 2]
			].map(([x, z], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					x,
					.11,
					z
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.009,
					.22,
					.009
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.ink })]
			}, i)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.222,
					0
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					s + .018,
					.008,
					s + .018
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.ink })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.21,
					0
				],
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.004,
					.004,
					s * .9,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.steel })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					PRINTER.bedY,
					0
				],
				receiveShadow: true,
				onPointerDown: (e) => {
					down.current = {
						x: e.clientX,
						y: e.clientY
					};
				},
				onPointerUp: (e) => {
					if (!down.current) return;
					if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6) return;
					e.stopPropagation();
					useArm.getState().goToPoint([
						e.point.x,
						PRINTER.bedY + .03,
						e.point.z
					]);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					s * .9,
					.005,
					s * .9
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.steel })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					PRINTER.bedY + .0032,
					0
				],
				receiveShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					s * .78,
					.001,
					s * .78
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#3a3e38",
					roughness: .55,
					metalness: .35
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.186,
					s / 2 - .006
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					s * .88,
					.007,
					.01
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.plaLight })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.028,
					.168,
					s / 2 - .018
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.026,
					.038,
					.03
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.servo })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
				position: [
					.04,
					.214,
					-s / 2 + .01
				],
				rotation: [
					1.05,
					.08,
					0
				],
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
						position: [
							0,
							.012,
							0
						],
						castShadow: true,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
							.006,
							.028,
							.006
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.pla })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
						castShadow: true,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
							.04,
							.008,
							.027
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.cam })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
						position: [
							.01,
							-.007,
							0
						],
						rotation: [
							Math.PI / 2,
							0,
							0
						],
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
							.0062,
							.0076,
							.01,
							16
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
							color: "#101210",
							roughness: .45
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
						position: [
							.01,
							-.012,
							0
						],
						rotation: [
							Math.PI / 2,
							0,
							0
						],
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
							.003,
							.003,
							.005,
							12
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
							color: "#4a5648",
							emissive: "#6a7a68",
							emissiveIntensity: .55
						})]
					})
				]
			})
		]
	});
}
function PartMesh({ part }) {
	const ref = (0, import_react.useRef)(null);
	const meta = KIND_META[part.kind];
	useFrame(() => {
		const live = visual.parts.find((p) => p.id === part.id);
		if (!ref.current || !live) return;
		ref.current.position.set(live.pos[0], live.pos[1], live.pos[2]);
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
		ref,
		onClick: (e) => {
			e.stopPropagation();
			useArm.getState().grabPart(part.id);
		},
		children: part.kind === "petg" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				.009,
				.011,
				.022,
				12
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: meta.color,
				roughness: .38,
				metalness: .12
			})]
		}) : part.kind === "fail" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			castShadow: true,
			rotation: [
				.2,
				.4,
				.1
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.022,
				.014,
				.022
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: meta.color,
				roughness: .62
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.022,
				.016,
				.022
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: meta.color,
				roughness: .52
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				.011,
				0
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
				.006,
				.007,
				.008,
				10
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: meta.accent,
				roughness: .48
			})]
		})] })
	});
}
function TDisplayBoard({ m }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		position: [
			.135,
			.02,
			.04
		],
		rotation: [
			-1.12,
			-.55,
			.05
		],
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.064,
				.007,
				.033
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.cam })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				.002,
				.0044,
				0
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.048,
				.001,
				.026
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#0b0c0b",
				emissive: "#3e4a3c",
				emissiveIntensity: .7,
				roughness: .28
			})]
		})]
	});
}
function Bin({ m, position, tone }) {
	const down = (0, import_react.useRef)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		position,
		onPointerDown: (e) => {
			down.current = {
				x: e.clientX,
				y: e.clientY
			};
		},
		onPointerUp: (e) => {
			if (!down.current) return;
			if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6) return;
			e.stopPropagation();
			useArm.getState().goToPoint([
				position[0],
				.06,
				position[2]
			]);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			receiveShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				.068,
				.004,
				.068
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: tone,
				roughness: .7
			})]
		}), [
			[
				.033,
				0,
				0,
				.004,
				.03,
				.068
			],
			[
				-.033,
				0,
				0,
				.004,
				.03,
				.068
			],
			[
				0,
				0,
				.033,
				.068,
				.03,
				.004
			],
			[
				0,
				0,
				-.033,
				.068,
				.03,
				.004
			]
		].map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				a[0],
				a[1] + .014,
				a[2]
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				a[3],
				a[4],
				a[5]
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.plaLight })]
		}, i))]
	});
}
function Floor() {
	const down = (0, import_react.useRef)(null);
	const m = useMat();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
		position: [
			.02,
			-.006,
			.1
		],
		receiveShadow: true,
		onPointerDown: (e) => {
			down.current = {
				x: e.clientX,
				y: e.clientY
			};
		},
		onPointerUp: (e) => {
			if (!down.current) return;
			if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6) return;
			e.stopPropagation();
			useArm.getState().goToPoint([
				e.point.x,
				.04,
				e.point.z
			]);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
			.56,
			.012,
			.5
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { ...m.table })]
	});
}
function Scene() {
	const m = useMat();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("color", {
			attach: "background",
			args: ["#0b0c0b"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("hemisphereLight", { args: [
			"#e6eadc",
			"#161810",
			.55
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ambientLight", { intensity: .18 }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
			position: [
				.42,
				.72,
				.32
			],
			intensity: 1.85,
			castShadow: true,
			"shadow-mapSize": [1024, 1024],
			"shadow-bias": -2e-4,
			"shadow-camera-near": .08,
			"shadow-camera-far": 1.5,
			"shadow-camera-left": -.32,
			"shadow-camera-right": .32,
			"shadow-camera-top": .32,
			"shadow-camera-bottom": -.32
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
			position: [
				-.35,
				.25,
				-.4
			],
			intensity: .28
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Floor, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Grid, {
			infiniteGrid: true,
			fadeDistance: 1.1,
			fadeStrength: 2.6,
			sectionColor: "#2a2c26",
			cellColor: "#1c1e18",
			sectionSize: .2,
			cellSize: .05,
			position: [
				0,
				.001,
				0
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticker, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArmRig, { m }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { m }),
		visual.parts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PartMesh, { part: p }, p.id)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bin, {
			m,
			position: BIN_POS,
			tone: "#2e382c"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bin, {
			m,
			position: BIN_RIGHT,
			tone: "#2a2e38"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TDisplayBoard, { m }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContactShadows, {
			position: [
				0,
				.002,
				0
			],
			opacity: .45,
			scale: 1.2,
			blur: 2.4
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrbitControls, {
			makeDefault: true,
			enableDamping: true,
			dampingFactor: .1,
			minDistance: .2,
			maxDistance: .95,
			maxPolarAngle: Math.PI / 2.08,
			target: [
				.01,
				.08,
				.11
			],
			ref: (el) => {
				if (el) viewApi.reset = () => el.reset();
			}
		})
	] });
}
function ArmViewport() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative h-full min-h-[220px] w-full touch-none bg-bg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Canvas, {
			shadows: "percentage",
			dpr: [1, 1.75],
			camera: {
				position: [
					.28,
					.2,
					.32
				],
				fov: 30,
				near: .02,
				far: 6
			},
			gl: {
				antialias: true,
				alpha: false,
				powerPreference: "high-performance"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scene, {})
		})
	});
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var badgeVariants = cva("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide", {
	variants: { variant: {
		default: "bg-surface-2 text-muted",
		accent: "bg-accent text-accent-fg",
		ok: "bg-ok/15 text-ok",
		warn: "bg-warn/15 text-warn",
		live: "bg-ok/15 text-ok"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,opacity,transform,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-surface-2 text-fg shadow-[var(--shadow-border)] hover:bg-surface-2/80",
			ghost: "text-fg hover:bg-surface-2",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
			danger: "bg-danger text-fg hover:opacity-90"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 rounded-sm px-3 text-xs",
			lg: "h-12 px-5",
			icon: "size-11",
			"icon-sm": "size-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
/** LilyGO T-Display S3 — header 2.54 mm, écran 170×320 ST7789 8-bit. */
var TDISPLAY = {
	name: "LilyGO T-Display S3",
	short: "T-Display S3",
	screen: {
		w: 320,
		h: 170,
		driver: "ST7789",
		bus: "i8080 8-bit"
	},
	pcb: "62.3 × 38 mm · USB-C · PSRAM 8 Mo",
	apSsid: "PINCE",
	apPass: "pince1234",
	wsUrl: "ws://192.168.4.1:81",
	powerOn: 15,
	backlight: 38,
	batteryAdc: 4,
	btnBoot: 0,
	btn2: 14,
	i2cSda: 18,
	i2cScl: 17
};
var SERVO_PINS = {
	base: 1,
	shoulder: 2,
	elbow: 3,
	wrist: 10,
	grip: 11
};
var HEADER_P2 = [
	{
		label: "3V3",
		role: "3,3 V (max 100 mA)",
		kind: "pwr"
	},
	{
		label: "GPIO1",
		gpio: 1,
		role: "Servo base",
		kind: "servo"
	},
	{
		label: "GPIO2",
		gpio: 2,
		role: "Servo épaule",
		kind: "servo"
	},
	{
		label: "GPIO3",
		gpio: 3,
		role: "Servo coude · strapping",
		kind: "servo"
	},
	{
		label: "GPIO10",
		gpio: 10,
		role: "Servo poignet",
		kind: "servo"
	},
	{
		label: "GPIO11",
		gpio: 11,
		role: "Servo pince",
		kind: "servo"
	},
	{
		label: "GPIO12",
		gpio: 12,
		role: "US TRIG",
		kind: "us"
	},
	{
		label: "GPIO13",
		gpio: 13,
		role: "US ECHO",
		kind: "us"
	},
	{
		label: "GND",
		role: "Masse commune servos",
		kind: "gnd"
	},
	{
		label: "5V",
		role: "VBUS USB — pas les servos",
		kind: "pwr"
	}
];
var HEADER_P1 = [
	{
		label: "GND",
		role: "Masse",
		kind: "gnd"
	},
	{
		label: "GND",
		role: "Masse",
		kind: "gnd"
	},
	{
		label: "GPIO43",
		gpio: 43,
		role: "U0TXD — console",
		kind: "uart"
	},
	{
		label: "GPIO44",
		gpio: 44,
		role: "U0RXD — console",
		kind: "uart"
	},
	{
		label: "GPIO18",
		gpio: 18,
		role: "I²C SDA (CAM / extra)",
		kind: "free"
	},
	{
		label: "GPIO17",
		gpio: 17,
		role: "I²C SCL",
		kind: "free"
	},
	{
		label: "GPIO21",
		gpio: 21,
		role: "Libre PWM",
		kind: "free"
	},
	{
		label: "GPIO16",
		gpio: 16,
		role: "Libre PWM",
		kind: "free"
	},
	{
		label: "GND",
		role: "Masse",
		kind: "gnd"
	},
	{
		label: "3V3",
		role: "3,3 V",
		kind: "pwr"
	}
];
var FLASH_STEPS = [
	"Arduino IDE 2 · carte « ESP32S3 Dev Module »",
	"USB CDC On Boot : Enabled · PSRAM : OPI PSRAM · Flash : 16 MB QIO",
	"TFT_eSPI : dans User_Setup_Select.h, décommenter Setup206_LilyGo_T_Display_S3.h",
	"Libs : TFT_eSPI, ESP32Servo, ArduinoJson, WebSockets (Markus Sattler)",
	"Maintenir BOOT, brancher l’USB-C, flasher, relâcher",
	"Servos sur alim 5 V 3 A externe, GND commun au header GND — jamais le 3V3"
];
var ESP32_CAM = {
	name: "ESP32-CAM AI-Thinker",
	sensor: "OV2640 640×480",
	note: "Rejoint le Wi-Fi PINCE, stream MJPEG :81/stream",
	stream: "http://192.168.4.2:81/stream",
	flashGpio: 4
};
var CAM_FLASH_STEPS = [
	"Arduino IDE · carte « AI Thinker ESP32-CAM »",
	"Outils → PSRAM : Enabled · Partition : Huge APP",
	"Flasher avec un USB-TTL : U0R←TX, U0T→RX, GND, 5 V. GPIO0 au GND pendant le flash",
	"Relâcher GPIO0, reset. La CAM rejoint l’AP PINCE et sert http://192.168.4.2:81/stream",
	"Fixer le module au portique, objectif vers le plateau. Flash LED = GPIO4"
];
var Slider = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
	ref,
	className: cn("relative flex w-full touch-none select-none items-center", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
		className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-accent" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block size-4 rounded-full bg-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" })]
}));
Slider.displayName = Slider$1.displayName;
function Hold({ onTick, label }) {
	const id = (0, import_react.useRef)(null);
	const start = () => {
		onTick();
		id.current = window.setInterval(onTick, 85);
	};
	const stop = () => {
		if (id.current != null) window.clearInterval(id.current);
		id.current = null;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		className: "grid size-11 shrink-0 place-items-center rounded-md bg-surface-2 text-fg shadow-[var(--shadow-border)] active:scale-[0.96]",
		onPointerDown: start,
		onPointerUp: stop,
		onPointerLeave: stop,
		onPointerCancel: stop,
		children: label.includes("plus") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
	});
}
function Row({ id }) {
	const value = useArm((s) => s.target[id]);
	const meta = JOINT_META[id];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-1 items-center gap-2 sm:grid-cols-[4.5rem_1fr_auto]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between sm:block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium text-fg",
					children: meta.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-[11px] tabular-nums text-muted",
					children: [
						Math.round(value),
						meta.unit,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ml-1 text-faint",
							children: ["G", SERVO_PINS[id]]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: meta.min,
				max: meta.max,
				step: 1,
				value: [value],
				onValueChange: ([v]) => useArm.getState().setJoint(id, v ?? value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
					label: `${meta.label} moins`,
					onTick: () => useArm.getState().nudge(id, -4)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
					label: `${meta.label} plus`,
					onTick: () => useArm.getState().nudge(id, 4)
				})]
			})
		]
	});
}
function JointPanel() {
	const speed = useArm((s) => s.speed);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [JOINT_IDS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { id }, id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-[4.5rem_1fr] items-center gap-2 pt-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium text-fg",
				children: "Vitesse"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: .2,
				max: 1,
				step: .02,
				value: [speed],
				onValueChange: ([v]) => useArm.getState().setSpeed(v ?? speed)
			})]
		})]
	});
}
var FIRMWARE_INO = `// PINCE — LilyGO T-Display S3 (ESP32-S3, ST7789 170×320)
// Arduino : ESP32S3 Dev Module · USB CDC On Boot Enabled · OPI PSRAM · Flash 16MB
// TFT_eSPI : User_Setup_Select.h → Setup206_LilyGo_T_Display_S3.h
// Libs : TFT_eSPI, ESP32Servo, ArduinoJson, WebSockets by Markus Sattler
//
// Header P2 (gauche) :
//   GPIO1 base · GPIO2 épaule · GPIO3 coude · GPIO10 poignet · GPIO11 pince
//   GPIO12 TRIG · GPIO13 ECHO · GND commun · 5V = VBUS USB (ne pas y brancher les servos)
// Alim servos : 5 V 3 A EXTERNE + GND commun.
// GPIO15 = POWER_ON écran — le firmware le met à HIGH.
// BTN2 (GPIO14) court = home · long = stop
// Wi-Fi AP : PINCE / pince1234 · ws://192.168.4.1:81
// JSON {"t":"pose","j":{"base":90,"shoulder":118,"elbow":48,"wrist":108,"grip":72},"spd":0.6}

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <TFT_eSPI.h>

#define PIN_POWER 15
#define PIN_BTN2  14
#define PIN_BATT  4
#define PIN_TRIG  12
#define PIN_ECHO  13

const int SERVO_PIN[5] = {1, 2, 3, 10, 11};
const char* KEYS[5] = {"base","shoulder","elbow","wrist","grip"};
const char* LABELS[5] = {"BASE","EPAU","COUDE","POIG","PINCE"};
const int SMAX[5] = {180,180,180,180,90};

const char* AP_SSID = "PINCE";
const char* AP_PASS = "pince1234";

TFT_eSPI tft;
Servo srv[5];
WebSocketsServer ws(81);

float cur[5] = {90, 118, 48, 108, 72};
float tgt[5] = {90, 118, 48, 108, 72};
float spd = 0.6f;
uint32_t lastDraw = 0, lastBtn = 0, pressAt = 0;
bool pressed = false;
int clients = 0;

int clampi(int v, int a, int b){ return v < a ? a : (v > b ? b : v); }

void applyPose() {
  for (int i = 0; i < 5; i++) {
    cur[i] += (tgt[i] - cur[i]) * (0.08f + 0.28f * spd);
    srv[i].write(clampi((int)(cur[i] + 0.5f), 0, SMAX[i]));
  }
}

float usCm() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long d = pulseIn(PIN_ECHO, HIGH, 18000);
  if (!d) return -1;
  return d / 58.0f;
}

float battV() {
  // Pont diviseur LilyGO sur GPIO4
  return analogReadMilliVolts(PIN_BATT) * 2.0f / 1000.0f;
}

void sendState(uint8_t n) {
  StaticJsonDocument<256> doc;
  doc["t"] = "state";
  JsonObject j = doc.createNestedObject("j");
  for (int i = 0; i < 5; i++) j[KEYS[i]] = (int)cur[i];
  doc["us"] = usCm();
  doc["v"] = battV();
  String s; serializeJson(doc, s);
  ws.sendTXT(n, s);
}

void onWs(uint8_t n, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) { clients++; return; }
  if (type == WStype_DISCONNECTED) { clients = max(0, clients - 1); return; }
  if (type != WStype_TEXT) return;
  StaticJsonDocument<384> doc;
  if (deserializeJson(doc, payload, length)) return;
  const char* t = doc["t"] | "";
  if (!strcmp(t, "ping")) { sendState(n); return; }
  if (!strcmp(t, "stop") || !strcmp(t, "home")) {
    if (!strcmp(t, "home")) {
      const float h[5] = {90, 118, 48, 108, 72};
      for (int i = 0; i < 5; i++) tgt[i] = h[i];
    } else {
      for (int i = 0; i < 5; i++) tgt[i] = cur[i];
    }
    return;
  }
  if (!strcmp(t, "pose")) {
    JsonObject j = doc["j"];
    for (int i = 0; i < 5; i++) if (j.containsKey(KEYS[i])) tgt[i] = j[KEYS[i]];
    if (doc.containsKey("spd")) spd = doc["spd"];
  }
}

void drawUi() {
  const uint16_t BG = 0x1082, FG = 0xE73B, MUT = 0x8C71, ACC = 0xC616, OK = 0x8DE9;
  static bool chrome = false;
  static int lastBar[5] = {-1,-1,-1,-1,-1};
  static int lastUs = -999;
  static int lastCli = -1;
  if (!chrome) {
    tft.fillScreen(BG);
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(ACC, BG);
    tft.drawString("PINCE", 8, 6, 2);
    tft.setTextColor(MUT, BG);
    tft.drawString("T-DISPLAY S3", 70, 10, 1);
    for (int i = 0; i < 5; i++) {
      int y = 28 + i * 22;
      tft.setTextDatum(TL_DATUM);
      tft.setTextColor(MUT, BG);
      tft.drawString(LABELS[i], 8, y, 1);
    }
    tft.setTextColor(MUT, BG);
    tft.drawString("BTN2 home", 220, 144, 1);
    chrome = true;
  }
  char buf[24];
  snprintf(buf, sizeof(buf), "%.2fV", battV());
  tft.setTextDatum(TR_DATUM);
  tft.setTextColor(OK, BG);
  tft.drawString(buf, 312, 8, 1);

  for (int i = 0; i < 5; i++) {
    int w = (int)(200.0f * cur[i] / SMAX[i]);
    if (w == lastBar[i]) continue;
    lastBar[i] = w;
    int y = 28 + i * 22;
    tft.fillRect(56, y + 2, 200, 10, 0x2104);
    tft.fillRect(56, y + 2, w, 10, ACC);
    snprintf(buf, sizeof(buf), "%3d", (int)cur[i]);
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(FG, BG);
    tft.drawString(buf, 312, y, 1);
  }

  float d = usCm();
  int di = (int)(d * 10);
  if (di != lastUs || clients != lastCli) {
    lastUs = di; lastCli = clients;
    tft.fillRect(8, 142, 200, 16, BG);
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(MUT, BG);
    if (d < 0) tft.drawString("US --", 8, 144, 1);
    else {
      snprintf(buf, sizeof(buf), "US %.1f cm", d);
      tft.drawString(buf, 8, 144, 1);
    }
    tft.setTextColor(clients ? OK : MUT, BG);
    tft.drawString(clients ? "WS ON" : "AP PINCE", 120, 144, 1);
  }
}

void handleBtn() {
  bool down = digitalRead(PIN_BTN2) == LOW;
  uint32_t now = millis();
  if (down && !pressed) { pressed = true; pressAt = now; }
  if (!down && pressed) {
    pressed = false;
    uint32_t dt = now - pressAt;
    if (dt > 50 && dt < 700) {
      const float h[5] = {90, 118, 48, 108, 72};
      for (int i = 0; i < 5; i++) tgt[i] = h[i];
    } else if (dt >= 700) {
      for (int i = 0; i < 5; i++) tgt[i] = cur[i];
    }
  }
}

void setup() {
  pinMode(PIN_POWER, OUTPUT);
  digitalWrite(PIN_POWER, HIGH); // obligatoire : alimente LCD + periphs
  pinMode(PIN_BTN2, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  analogReadResolution(12);

  Serial.begin(115200);
  delay(150);
  tft.init();
  tft.setRotation(1); // 320 × 170
  tft.fillScreen(0x1082);

  for (int i = 0; i < 5; i++) {
    srv[i].setPeriodHertz(50);
    srv[i].attach(SERVO_PIN[i], 500, 2500);
    srv[i].write((int)cur[i]);
  }

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  ws.begin();
  ws.onEvent(onWs);
  Serial.println(WiFi.softAPIP());
  drawUi();
}

void loop() {
  ws.loop();
  applyPose();
  handleBtn();
  if (millis() - lastDraw > 180) {
    lastDraw = millis();
    drawUi();
  }
  delay(8);
}
`;
var TFT_SETUP = `// Copier dans Arduino/libraries/TFT_eSPI/User_Setup_Select.h
// Commenter #include <User_Setup.h>
// Décommenter la ligne :

#include <User_Setups/Setup206_LilyGo_T_Display_S3.h>
`;
var CAM_INO = `// PINCE — ESP32-CAM AI-Thinker (OV2640)
// Arduino : AI Thinker ESP32-CAM · PSRAM Enabled · Huge APP
// Flash : USB-TTL 5V, U0R←TX, U0T→RX, GND, GPIO0 au GND pendant le flash
// Rejoint l'AP du T-Display S3 : PINCE / pince1234
// Stream : http://192.168.4.2:81/stream   Still : http://192.168.4.2/capture

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

const char* SSID = "PINCE";
const char* PASS = "pince1234";

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define FLASH_GPIO         4

httpd_handle_t stream_httpd = NULL;
httpd_handle_t cam_httpd = NULL;

static const char* STREAM_CT = "multipart/x-mixed-replace;boundary=frame";

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  char part[64];
  httpd_resp_set_type(req, STREAM_CT);
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) { res = ESP_FAIL; break; }
    size_t hlen = snprintf(part, sizeof(part),
      "--frame\\r\\nContent-Type: image/jpeg\\r\\nContent-Length: %u\\r\\n\\r\\n", fb->len);
    res = httpd_resp_send_chunk(req, part, hlen);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, "\\r\\n", 2);
    esp_camera_fb_return(fb);
    if (res != ESP_OK) break;
  }
  return res;
}

static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) return ESP_FAIL;
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  esp_err_t r = httpd_resp_send(req, (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return r;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  httpd_uri_t cap = { .uri="/capture", .method=HTTP_GET, .handler=capture_handler, .user_ctx=NULL };
  if (httpd_start(&cam_httpd, &config) == ESP_OK) httpd_register_uri_handler(cam_httpd, &cap);
  config.server_port = 81;
  config.ctrl_port = 32769;
  httpd_uri_t st = { .uri="/stream", .method=HTTP_GET, .handler=stream_handler, .user_ctx=NULL };
  if (httpd_start(&stream_httpd, &config) == ESP_OK) httpd_register_uri_handler(stream_httpd, &st);
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO, OUTPUT);
  digitalWrite(FLASH_GPIO, LOW);

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 2;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_LATEST;
  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("cam init fail");
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(250);
  Serial.println(WiFi.localIP());
  startCameraServer();
}

void loop() { delay(10000); }
`;
var PI_BRIDGE = `#!/usr/bin/env python3
# PINCE — pont Raspberry Pi 4 (optionnel) vers LilyGO T-Display S3
# python3 pince-pi.py --esp ws://192.168.4.1:81

import argparse, asyncio, json, websockets
from aiohttp import web

ESP = None
clients = set()

async def pump_esp(url):
    global ESP
    while True:
        try:
            async with websockets.connect(url) as ws:
                ESP = ws
                async for msg in ws:
                    for c in list(clients):
                        await c.send_str(msg)
        except Exception as e:
            print("esp", e)
            await asyncio.sleep(2)

async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    clients.add(ws)
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT and ESP:
                await ESP.send(msg.data)
    finally:
        clients.discard(ws)
    return ws

async def health(_):
    return web.json_response({"ok": True, "esp": ESP is not None})

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--esp", default="ws://192.168.4.1:81")
    p.add_argument("--port", type=int, default=8088)
    args = p.parse_args()
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/health", health)
    loop = asyncio.get_event_loop()
    loop.create_task(pump_esp(args.esp))
    web.run_app(app, host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
`;
var OPENSCAD = `// PINCE — pack imprimable 5 DDL + pince + berceau LilyGO T-Display S3
// OpenSCAD · F6 → STL · mm · 0.2 mm, 3 parois, 25–30 % infill, PLA/PETG

$fn = 48;
sg90_body = [23.2, 12.4, 22.5];
sg90_flange = [32.2, 12.4, 2.6];
clear = 0.35;

module sg90_pocket() {
  cube(sg90_body + [clear, clear, 8], center=true);
  translate([0,0,sg90_body.z/2]) cube(sg90_flange + [clear, clear, 0], center=true);
}

module plate_base() {
  difference() {
    hull() {
      for (x=[-38,38], y=[-38,38]) translate([x,y,0]) cylinder(h=6, r=6);
    }
    for (a=[0,90,180,270]) rotate([0,0,a]) translate([32,32,-1]) cylinder(h=10, d=3.3);
    translate([0,0,8]) sg90_pocket();
  }
}

module link(len=110, thick=8, wide=16) {
  difference() {
    union() {
      hull() {
        cylinder(h=thick, d=wide);
        translate([len,0,0]) cylinder(h=thick, d=wide-2);
      }
      translate([0,0,thick]) cylinder(h=4, d=7);
    }
    translate([0,0,-1]) cylinder(h=thick+8, d=2.2);
    translate([len,0,-1]) cylinder(h=thick+8, d=2.2);
    for (i=[1:4]) rotate([0,0,i*90]) translate([4.6,0,-1]) cylinder(h=6, d=1.4);
  }
}

module jaw() {
  difference() {
    union() {
      cube([8, 12, 36], center=true);
      translate([0,0,16]) cube([8, 18, 8], center=true);
      translate([5,0,-10]) cube([10, 3, 16], center=true);
    }
    translate([0,0,16]) rotate([90,0,0]) cylinder(h=20, d=2.2, center=true);
  }
}

module gripper_palm() {
  difference() {
    cube([34, 22, 14], center=true);
    translate([0,0,4]) cube([18, 14, 12], center=true);
    for (x=[-10,10]) translate([x,0,0]) rotate([90,0,0]) cylinder(h=30, d=2.2, center=true);
  }
}

// Berceau T-Display S3 — carte ~64 × 32 × 8, USB-C dégagé, boutons accessibles
module tdisplay_cradle() {
  difference() {
    rounded(70, 38, 10, 3);
    translate([3, 3, 3]) rounded(64, 32, 10, 2);
    translate([-1, 12, 4]) cube([8, 10, 8]); // USB-C
    translate([28, -1, 6]) cube([16, 6, 6]); // BTN2 / BOOT
  }
}

module cam_mount() {
  difference() {
    union() {
      cube([36, 10, 4]);
      translate([8, 10, 0]) cube([20, 18, 4]);
      translate([12, 22, 4]) cylinder(h=8, d=10);
    }
    translate([18, 28, -1]) cylinder(h=16, d=6.2); // objectif
    for (x=[4, 32]) translate([x, 5, -1]) cylinder(h=8, d=2.2);
  }
}

module rounded(x, y, z, r) {
  hull() {
    for (ix=[r, x-r], iy=[r, y-r]) translate([ix, iy, 0]) cylinder(h=z, r=r);
  }
}

module assembly() {
  plate_base();
  translate([0,0,28]) rotate([0,90,0]) link(120);
  translate([0,0,28]) rotate([0,90,35]) translate([120,0,0]) link(105);
  translate([90,40,8]) gripper_palm();
  translate([90,60,8]) jaw();
  translate([90,78,8]) mirror([1,0,0]) jaw();
  translate([-90, -20, 0]) tdisplay_cradle();
  translate([40, -50, 0]) cam_mount();
}

assembly();
`;
function downloadText(filename, content, mime = "text/plain") {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
async function downloadKitZip() {
	const res = await fetch("/pince-kit.zip");
	if (!res.ok) throw new Error("zip introuvable");
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "PINCE-kit.zip";
	a.click();
	URL.revokeObjectURL(url);
}
function TDisplay({ compact = false }) {
	const [pose, setPose] = (0, import_react.useState)({ ...HOME_JOINTS });
	const us = useArm((s) => s.ultrasonic);
	const batt = useArm((s) => s.batteryV);
	const connected = useArm((s) => s.connected);
	const playMode = useArm((s) => s.playMode);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => {
			setPose({ ...visual.current });
		}, 90);
		return () => window.clearInterval(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("shrink-0", compact ? "w-[196px]" : "w-[220px] sm:w-[248px]"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl bg-[#16180f] p-1.5 shadow-[var(--shadow-border)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-1 pb-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[9px] font-medium tracking-[0.16em] text-faint",
						children: "LILYGO"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[9px] text-faint",
						children: "T-DISPLAY S3"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative overflow-hidden rounded-sm bg-bg px-2 py-1.5 font-mono",
					style: { aspectRatio: "320 / 170" },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] font-medium tracking-wide text-accent",
								children: "PINCE"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[9px] tabular-nums text-ok",
								children: [batt.toFixed(2), "V"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 flex flex-col gap-[3px]",
							children: JOINT_IDS.map((id) => {
								const max = JOINT_META[id].max;
								const v = pose[id];
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "w-8 text-[8px] uppercase tracking-wide text-faint",
											children: JOINT_META[id].short
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-full bg-accent",
												style: { width: `${v / max * 100}%` }
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "w-6 text-right text-[8px] tabular-nums text-fg",
											children: Math.round(v)
										})
									]
								}, id);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1.5 flex items-center justify-between text-[8px] text-faint",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tabular-nums",
									children: [
										"US ",
										us.toFixed(1),
										" cm"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn(connected ? "text-ok" : "text-faint"),
									children: connected ? "WS ON" : "AP PINCE"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: playMode === "idle" ? "BTN2 home" : "RUN" })
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1.5 flex items-center justify-between px-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-6 rounded-full bg-surface-2 px-2 text-[9px] text-muted",
							onClick: () => useArm.getState().playMission("wave"),
							children: "BOOT"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[8px] text-faint",
							children: "GPIO14"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-6 rounded-full bg-accent px-2 text-[9px] font-medium text-accent-fg",
							onClick: () => useArm.getState().goHome(),
							children: "BTN2"
						})
					]
				})
			]
		}), compact ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-1 text-center text-[10px] text-faint",
			children: [
				"Clone 170×320 · ",
				TDISPLAY.apSsid,
				" / ",
				TDISPLAY.apPass
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-0.5 hidden text-center font-mono text-[9px] text-faint sm:block",
			children: JOINT_IDS.map((id) => `${id[0]}:${SERVO_PINS[id]}`).join("  ")
		})] })]
	});
}
function PinList({ title, pins }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-faint",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "flex flex-col gap-0.5",
		children: pins.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "grid grid-cols-[4.2rem_1fr] items-baseline gap-2 font-mono text-[10px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("tabular-nums", p.kind === "servo" && "text-accent", p.kind === "us" && "text-ok", p.kind === "gnd" && "text-muted", p.kind === "pwr" && "text-warn", p.kind === "free" && "text-fg", p.kind === "uart" && "text-faint"),
				children: p.label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate text-muted",
				children: p.role
			})]
		}, `${p.label}-${i}`))
	})] });
}
function KitPanel() {
	const liveUrl = useArm((s) => s.liveUrl);
	const connected = useArm((s) => s.connected);
	const connecting = useArm((s) => s.connecting);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 text-sm leading-relaxed text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "md:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TDisplay, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
					children: "Cerveau"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-fg",
					children: TDISPLAY.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs",
					children: [
						TDISPLAY.pcb,
						" · écran ",
						TDISPLAY.screen.w,
						"×",
						TDISPLAY.screen.h,
						" ",
						TDISPLAY.screen.driver
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 rounded-lg bg-bg p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinList, {
					title: "Header P2 · bras",
					pins: HEADER_P2
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinList, {
					title: "Header P1 · libre",
					pins: HEADER_P1
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs",
				children: "GPIO15 est le POWER_ON : le firmware le force à HIGH, sinon l’écran reste noir. GPIO3 est un strapping — brancher le servo coude après le boot. Servos sur 5 V 3 A externe, GND commun. Ne pas tirer les 5 servos depuis le 5V USB de la carte."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
				children: "Flash"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-2 list-decimal space-y-1 pl-4 text-xs text-fg",
				children: FLASH_STEPS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: s }, s))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						onClick: () => void downloadKitZip(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "Kit complet (.zip)"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						onClick: () => downloadText("pince-tdisplay-s3.ino", FIRMWARE_INO),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "Firmware T-Display S3"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						onClick: () => downloadText("User_Setup_Select-snippet.h", TFT_SETUP),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "Setup TFT_eSPI"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						onClick: () => downloadText("pince-esp32-cam.ino", CAM_INO),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "Firmware ESP32-CAM"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						onClick: () => downloadText("pince-arm.scad", OPENSCAD),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "OpenSCAD + berceau écran"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						onClick: () => downloadText("pince-pi.py", PI_BRIDGE),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "Pont Raspberry Pi"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
					children: "Œil · ESP32-CAM"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-fg",
					children: ESP32_CAM.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs",
					children: [
						ESP32_CAM.sensor,
						" · ",
						ESP32_CAM.note
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "mt-2 list-decimal space-y-1 pl-4 text-xs text-fg",
					children: CAM_FLASH_STEPS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: s }, s))
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
					children: "Lien carte"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-xs",
					children: [
						"Téléphone sur le Wi-Fi ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fg",
							children: TDISPLAY.apSsid
						}),
						" (",
						TDISPLAY.apPass,
						"), puis connecte. BTN2 (côté carte) = home, appui long = stop."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: liveUrl,
					onChange: (e) => useArm.getState().setLiveUrl(e.target.value),
					className: "mt-2 h-11 w-full rounded-md bg-surface-2 px-3 font-mono text-xs text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
					"aria-label": "URL WebSocket T-Display S3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex gap-2",
					children: connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "outline",
						onClick: () => useArm.getState().disconnectLive(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Unplug, {}), "Couper"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						onClick: () => useArm.getState().connectLive(),
						disabled: connecting,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, {}), connecting ? "Connexion…" : "Lier le LilyGO"]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs",
					children: connected ? "T-Display S3 lié — les poses partent sur la carte." : "Simulateur — l’écran ci-contre mime le 170×320."
				})
			] })
		]
	});
}
var STEPS = [
	2,
	8,
	20
];
function HoldBtn({ label, onTick, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		className: cn("grid h-11 min-w-11 place-items-center rounded-md bg-surface-2 font-mono text-xs text-fg shadow-[var(--shadow-border)] active:scale-[0.96]", className),
		onPointerDown: (e) => {
			e.preventDefault();
			onTick();
			const id = window.setInterval(onTick, 90);
			const stop = () => {
				window.clearInterval(id);
				window.removeEventListener("pointerup", stop);
			};
			window.addEventListener("pointerup", stop);
		},
		children: label
	});
}
function JogPad() {
	const mode = useArm((s) => s.jogMode);
	const step = useArm((s) => s.jogStep);
	const arm = () => useArm.getState();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1",
				children: ["cart", "joint"].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => arm().setJogMode(m),
					className: cn("h-9 flex-1 rounded-full text-xs font-medium", mode === m ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"),
					children: m === "cart" ? "XYZ" : "Axes"
				}, m))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1",
				children: STEPS.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => arm().setJogStep(n),
					className: cn("h-9 flex-1 rounded-full font-mono text-xs", step === n ? "bg-surface-2 text-fg" : "text-muted"),
					children: [n, mode === "cart" ? " mm" : "°"]
				}, n))
			}),
			mode === "cart" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Z+",
						onTick: () => arm().jogCart("z", 1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Y+",
						onTick: () => arm().jogCart("y", 1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "X−",
						onTick: () => arm().jogCart("x", -1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "⌂",
						onTick: () => arm().goHome()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "X+",
						onTick: () => arm().jogCart("x", 1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Z−",
						onTick: () => arm().jogCart("z", -1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Y−",
						onTick: () => arm().jogCart("y", -1)
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Base −",
						onTick: () => arm().nudge("base", -step)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Base +",
						onTick: () => arm().nudge("base", step)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Épau. −",
						onTick: () => arm().nudge("shoulder", -step)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Épau. +",
						onTick: () => arm().nudge("shoulder", step)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Coude −",
						onTick: () => arm().nudge("elbow", -step)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
						label: "Coude +",
						onTick: () => arm().nudge("elbow", step)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
					label: "Ouvre",
					onTick: () => arm().nudge("grip", 6)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoldBtn, {
					label: "Ferme",
					onTick: () => arm().nudge("grip", -6)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "h-11 rounded-md bg-accent text-xs font-medium text-accent-fg",
				onClick: () => arm().grabNearest(),
				children: "Attraper"
			})
		]
	});
}
function TcpHud() {
	const [snap, setSnap] = (0, import_react.useState)({
		x: 0,
		y: 0,
		z: 0,
		r: 55,
		h: null,
		n: 3
	});
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => {
			const t = visual.tcp;
			setSnap({
				x: t[0] * 1e3,
				y: t[1] * 1e3,
				z: t[2] * 1e3,
				r: Math.round(visual.reach * 100),
				h: visual.hazard,
				n: visual.parts.filter((p) => !p.held).length
			});
		}, 80);
		return () => window.clearInterval(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none rounded-md bg-bg/80 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-muted",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
			"TCP ",
			snap.x.toFixed(0).padStart(4),
			" ",
			snap.y.toFixed(0).padStart(4),
			" ",
			snap.z.toFixed(0).padStart(4),
			" mm"
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: snap.h ? "text-danger" : "text-ok",
				children: snap.h ? snap.h.toUpperCase() : "SAFE"
			}),
			"  ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				"REACH ",
				snap.r,
				"%"
			] }),
			"  ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [snap.n, " obj"] })
		] })]
	});
}
function PartLegend() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "flex flex-col gap-1 text-xs text-muted",
		children: visual.parts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-surface-2",
			onClick: () => {
				useArm.getState().grabPart(p.id);
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "size-2.5 rounded-full",
					style: { background: KIND_META[p.kind].color }
				}),
				KIND_META[p.kind].label,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "ml-auto font-mono text-[10px] text-faint",
					children: ["bac ", KIND_META[p.kind].bin]
				})
			]
		}) }, p.id))
	});
}
function MissionPanel() {
	const missionId = useArm((s) => s.missionId);
	const playMode = useArm((s) => s.playMode);
	const playIndex = useArm((s) => s.playIndex);
	const active = useArm((s) => s.activeWaypoints);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [
			MISSIONS.map((m) => {
				const on = playMode === "mission" && missionId === m.id;
				const total = on && active.length ? active.length : m.waypoints.length;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => useArm.getState().playMission(m.id),
					className: cn("rounded-lg p-3 text-left shadow-[var(--shadow-border)] transition-colors duration-[var(--motion-quick)]", on ? "bg-surface-2" : "bg-surface hover:bg-surface-2"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-fg",
								children: m.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5 text-muted" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs leading-snug text-muted",
							children: m.blurb
						}),
						on ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 font-mono text-[11px] tabular-nums text-ok",
							children: [
								playIndex + 1,
								"/",
								total,
								" · ",
								active[playIndex]?.label
							]
						}) : null
					]
				}, m.id);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-1 text-xs font-medium uppercase tracking-[0.14em] text-faint",
					children: "Objets"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PartLegend, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "outline",
				onClick: () => useArm.getState().goHome(),
				children: "Home"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "outline",
				onClick: () => useArm.getState().grabNearest(),
				children: "Attraper"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				onClick: () => useArm.getState().resetPart(),
				children: "Reposer l'atelier"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				onClick: () => useArm.getState().stop(),
				children: "Stop"
			})
		]
	});
}
function SequencePanel() {
	const sequence = useArm((s) => s.sequence);
	const playMode = useArm((s) => s.playMode);
	const playIndex = useArm((s) => s.playIndex);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "sm",
					onClick: () => useArm.getState().recordWaypoint(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "Capturer"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "sm",
					variant: "secondary",
					onClick: () => useArm.getState().playSequence(),
					disabled: !sequence.length,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {}), "Jouer"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "sm",
					variant: "ghost",
					onClick: () => useArm.getState().stop(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {}), "Stop"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "sm",
					variant: "ghost",
					onClick: () => useArm.getState().clearSequence(),
					disabled: !sequence.length,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {}), "Vider"]
				})
			]
		}), sequence.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Place le bras, puis capture. Ou dis « enregistre » au micro."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "flex flex-col gap-1.5",
			children: sequence.map((wp, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `flex items-center justify-between rounded-md px-3 py-2 text-sm ${playMode === "sequence" && playIndex === i ? "bg-surface-2" : "bg-bg"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium",
						children: wp.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-[11px] tabular-nums text-muted",
						children: [
							Math.round(wp.joints.base),
							"/",
							Math.round(wp.joints.shoulder),
							"/",
							Math.round(wp.joints.elbow)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "grid size-9 place-items-center text-muted hover:text-fg",
						"aria-label": "Supprimer",
						onClick: () => useArm.getState().removeWaypoint(wp.id),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
					})
				]
			}, wp.id))
		})]
	});
}
/** Vue de l’ESP32-CAM : plongée sur le plateau, accrochée au portique. */
function worldToCam(p) {
	const o = PRINTER.origin;
	const s = PRINTER.bedSize * 1.15;
	const x = .5 + (p[0] - o[0]) / s;
	const y = .5 + (p[2] - o[2]) / s;
	return {
		x,
		y,
		visible: x > -.08 && x < 1.08 && y > -.08 && y < 1.08 && p[1] < .24
	};
}
var CAM = {
	name: "ESP32-CAM AI-Thinker",
	sensor: "OV2640",
	stream: "http://192.168.4.2:81/stream",
	still: "http://192.168.4.2/capture",
	apJoin: "PINCE",
	flashGpio: 4
};
function drawSim(ctx, w, h, t) {
	ctx.fillStyle = "#141610";
	ctx.fillRect(0, 0, w, h);
	const bed = Math.min(w, h) - 20;
	const bx = (w - bed) / 2;
	const by = (h - bed) / 2;
	ctx.fillStyle = "#2a2c26";
	ctx.fillRect(bx - 5, by - 5, bed + 10, bed + 10);
	ctx.fillStyle = "#7a818c";
	ctx.fillRect(bx, by, bed, bed);
	ctx.strokeStyle = "rgba(18,20,16,0.32)";
	ctx.lineWidth = 1;
	for (let i = 1; i < 4; i++) {
		const o = bed / 4 * i;
		ctx.beginPath();
		ctx.moveTo(bx + o, by);
		ctx.lineTo(bx + o, by + bed);
		ctx.moveTo(bx, by + o);
		ctx.lineTo(bx + bed, by + o);
		ctx.stroke();
	}
	const map = (p) => ({
		x: bx + p.x * bed,
		y: by + p.y * bed
	});
	const drawBin = (world, label) => {
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
		const open = 6 + visual.current.grip / 90 * 10;
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
		} else ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
		const conf = 86 + (t + part.id.charCodeAt(0)) % 9;
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
	ctx.fillStyle = `rgba(197,208,194,${.04 + Math.sin(t * .008) * .02})`;
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
function EyeFeed({ compact = false }) {
	const canvasRef = (0, import_react.useRef)(null);
	const camUrl = useArm((s) => s.camUrl);
	const camLive = useArm((s) => s.camLive);
	const [broken, setBroken] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
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
	(0, import_react.useEffect)(() => {
		setBroken(false);
	}, [camUrl, camLive]);
	const onCanvasClick = (e) => {
		const c = canvasRef.current;
		if (!c) return;
		const rect = c.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;
		const bed = Math.min(w, h) - 20;
		const bx = (w - bed) / 2;
		const by = (h - bed) / 2;
		const u = (e.clientX - rect.left - bx) / bed;
		const v = (e.clientY - rect.top - by) / bed;
		const s = PRINTER.bedSize * 1.15;
		const x = PRINTER.origin[0] + (u - .5) * s;
		const z = PRINTER.origin[2] + (v - .5) * s;
		useArm.getState().goToPoint([
			x,
			PRINTER.bedY + .04,
			z
		]);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]", compact ? "w-[176px]" : "w-full max-w-[280px]"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-2 py-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[9px] font-medium tracking-[0.16em] text-faint",
					children: "ŒIL"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[9px] text-faint",
					children: camLive && !broken ? "LIVE" : "DET OV2640"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative aspect-[4/3] bg-bg",
				children: camLive && !broken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: camUrl,
					alt: "Flux ESP32-CAM",
					className: "h-full w-full object-cover",
					onError: () => {
						setBroken(true);
						useArm.getState().setCamLive(false);
						useArm.getState().log("system", "Flux CAM injoignable — simulateur");
					}
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					className: "h-full w-full cursor-crosshair",
					onClick: onCanvasClick
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-2 py-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-7 rounded-full px-2 text-[10px] text-muted hover:text-fg",
					onClick: () => {
						const live = !useArm.getState().camLive;
						useArm.getState().setCamLive(live);
						if (live) useArm.getState().log("system", "Tentative flux ESP32-CAM");
					},
					children: camLive ? "Sim" : "Flux"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-7 rounded-full px-2 text-[10px] text-muted hover:text-fg",
					onClick: () => useArm.getState().lookAtPart(),
					children: "Viser"
				})]
			})
		]
	});
}
function EyeLink() {
	const camUrl = useArm((s) => s.camUrl);
	const camLive = useArm((s) => s.camLive);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3 text-sm text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [CAM.name, " sur le portique. Le simulateur classe PLA, PETG et rejet. Clique le flux pour envoyer la pince."] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
				htmlFor: "cam-url",
				children: "URL flux"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "cam-url",
				value: camUrl,
				onChange: (e) => useArm.getState().setCamUrl(e.target.value),
				className: "h-11 w-full rounded-md bg-surface-2 px-3 font-mono text-xs text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: camLive ? "outline" : "secondary",
				onClick: () => useArm.getState().setCamLive(!camLive),
				children: camLive ? "Revenir au simulateur" : "Ouvrir le flux réel"
			})
		]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var planArm = createServerFn({ method: "POST" }).validator((d) => d).handler(createSsrRpc("9a97e6112443cbf7e6bdcb98bccc1183b31a686930215fdb9d41e6c8c2e96e95"));
function getRec() {
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
function speak(text) {
	if (typeof window === "undefined" || !window.speechSynthesis) return;
	window.speechSynthesis.cancel();
	const u = new SpeechSynthesisUtterance(text);
	u.lang = "fr-FR";
	u.rate = 1.04;
	u.pitch = .98;
	window.speechSynthesis.speak(u);
}
async function runAi(text) {
	const s = useArm.getState();
	s.setAiBusy(true);
	try {
		const res = await planArm({ data: {
			prompt: text,
			joints: s.target,
			held: s.held
		} });
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
function useVoice() {
	const recRef = (0, import_react.useRef)(null);
	const wantRef = (0, import_react.useRef)(false);
	const lastFinal = (0, import_react.useRef)("");
	const handle = (0, import_react.useCallback)((cmd) => {
		if (cmd.kind === "ai") {
			runAi(cmd.text);
			return;
		}
		useArm.getState().applyCommand(cmd);
		if (cmd.kind === "mission" || cmd.kind === "home" || cmd.kind === "stop") speak(cmd.kind === "stop" ? "Arrêt" : cmd.kind === "home" ? "Position repos" : "Mission lancée");
	}, []);
	const start = (0, import_react.useCallback)(() => {
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
			if (wantRef.current) try {
				rec.start();
			} catch {}
			else useArm.getState().setListening(false);
		};
		try {
			rec.start();
		} catch {}
	}, [handle]);
	const stop = (0, import_react.useCallback)(() => {
		wantRef.current = false;
		recRef.current?.stop();
		useArm.getState().setListening(false);
	}, []);
	const toggle = (0, import_react.useCallback)(() => {
		if (wantRef.current) stop();
		else start();
	}, [start, stop]);
	(0, import_react.useEffect)(() => () => {
		wantRef.current = false;
		recRef.current?.abort();
	}, []);
	return {
		start,
		stop,
		toggle,
		runAi,
		speak
	};
}
var QUICK = [
	"trie par couleur",
	"enlève la pièce",
	"inspecte",
	"ouvre la pince",
	"va au plateau",
	"stop"
];
function VoiceDock() {
	const { toggle, runAi } = useVoice();
	const listening = useArm((s) => s.listening);
	const transcript = useArm((s) => s.transcript);
	const lastCommand = useArm((s) => s.lastCommand);
	const lastHeard = useArm((s) => s.lastHeard);
	const aiBusy = useArm((s) => s.aiBusy);
	const helpOpen = useArm((s) => s.helpOpen);
	const fire = (ex) => {
		useArm.getState().setTranscript(ex, true);
		const cmd = parseVoice(ex);
		if (!cmd) return;
		if (cmd.kind === "ai") runAi(cmd.text);
		else useArm.getState().applyCommand(cmd);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shrink-0 border-t border-border bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-[1400px] items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: toggle,
						"aria-pressed": listening,
						"aria-label": listening ? "Arrêter l'écoute" : "Commander à la voix",
						className: cn("relative grid size-14 shrink-0 place-items-center rounded-full transition-[transform,background-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)] active:scale-[0.96] sm:size-16", listening ? "bg-accent text-accent-fg shadow-[0_0_0_8px_color-mix(in_oklab,var(--color-accent)_22%,transparent)]" : "bg-surface-2 text-fg shadow-[var(--shadow-border)]"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-6" }), listening ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 animate-pulse rounded-full ring-2 ring-accent/50" }) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
								children: listening ? "Écoute" : "Voix · T-Display S3"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm text-fg",
								children: aiBusy ? "Planification…" : transcript || lastHeard || "Appuie et dis « ouvre la pince »"
							}),
							lastCommand ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-mono text-xs text-muted tabular-nums",
								children: lastCommand
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						onClick: () => useArm.getState().setHelpOpen(!helpOpen),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden sm:inline",
							children: "Commandes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sm:hidden",
							children: "Liste"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto mt-2 flex max-w-[1400px] flex-wrap gap-1.5",
				children: (helpOpen ? VOICE_EXAMPLES : QUICK).map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-9 rounded-full bg-surface-2 px-3 text-xs text-muted transition-colors duration-[var(--motion-quick)] hover:text-fg",
					onClick: () => fire(ex),
					children: ex
				}, ex))
			}),
			aiBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto mt-2 flex max-w-[1400px] items-center gap-2 text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3.5 animate-spin" }), "L’IA compose une séquence"]
			}) : null
		]
	});
}
var TABS = [
	{
		id: "voix",
		label: "Jog",
		mobileOnly: true
	},
	{
		id: "missions",
		label: "Missions",
		mobileOnly: false
	},
	{
		id: "sequence",
		label: "Séquence",
		mobileOnly: false
	},
	{
		id: "oeil",
		label: "Œil",
		mobileOnly: false
	},
	{
		id: "kit",
		label: "Kit",
		mobileOnly: false
	}
];
function Studio() {
	const panel = useArm((s) => s.panel);
	const held = useArm((s) => s.held);
	const ultrasonic = useArm((s) => s.ultrasonic);
	const connected = useArm((s) => s.connected);
	const playMode = useArm((s) => s.playMode);
	const { runAi } = useVoice();
	const [typed, setTyped] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const el = e.target;
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
		if (cmd?.kind === "ai") runAi(cmd.text);
		else if (cmd) useArm.getState().applyCommand(cmd);
		else runAi(t);
		setTyped("");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 md:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg font-medium tracking-tight text-fg",
							children: "PINCE"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate text-xs text-muted",
							children: [TDISPLAY.short, " · teach pendant · vision"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: connected ? "ok" : "default",
						children: connected ? "T-Display S3" : "Simulateur"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						variant: held ? "accent" : "default",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "mr-1 size-3" }), held ? "Tenu" : "Libre"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden font-mono text-xs tabular-nums text-muted sm:inline",
						children: [
							"US ",
							ultrasonic.toFixed(1),
							" cm"
						]
					}),
					playMode !== "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						size: "sm",
						variant: "ghost",
						onClick: () => useArm.getState().stop(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5" }), "Stop"]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden grid-cols-1 grid-rows-[minmax(260px,46vh)_minmax(0,1fr)] lg:grid-cols-[272px_minmax(0,1fr)_280px] lg:grid-rows-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "hidden min-h-0 overflow-y-auto border-r border-border p-4 lg:block",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-3 text-xs font-medium uppercase tracking-[0.14em] text-faint",
								children: "Pendant"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JogPad, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-3 mt-6 text-xs font-medium uppercase tracking-[0.14em] text-faint",
								children: "Axes"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JointPanel, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								className: "mt-6",
								onSubmit: (e) => {
									e.preventDefault();
									submitTyped();
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
									htmlFor: "cmd",
									children: "Commande"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "cmd",
									value: typed,
									onChange: (e) => setTyped(e.target.value),
									placeholder: "trie par couleur…",
									className: "mt-2 h-11 w-full rounded-md bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-accent/40"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "relative min-h-0 overflow-hidden",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArmViewport, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5 rounded-full bg-bg/80 px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-3" }), connected ? "live" : "sim"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TcpHud, {})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "pointer-events-auto absolute right-3 top-3 hidden h-9 rounded-full bg-bg/80 px-3 text-[11px] text-muted md:inline-flex md:items-center",
								onClick: () => viewApi.reset(),
								children: "Cadrer"
							}),
							panel !== "oeil" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "pointer-events-auto absolute left-3 bottom-3 hidden md:block",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeFeed, { compact: true })
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "pointer-events-auto absolute bottom-3 right-3 hidden origin-bottom-right md:block",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TDisplay, { compact: true })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "flex min-h-0 flex-col overflow-hidden border-t border-border lg:border-l lg:border-t-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex shrink-0 gap-1 overflow-x-auto p-2",
							children: TABS.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => useArm.getState().setPanel(tab.id),
								className: cn("h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-colors duration-[var(--motion-quick)]", tab.mobileOnly && "lg:hidden", panel === tab.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"),
								children: tab.label
							}, tab.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-h-0 flex-1 overflow-y-auto p-4",
							children: [
								panel === "voix" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "lg:hidden",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JogPad, {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-6",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JointPanel, {})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
											className: "mt-4",
											onSubmit: (e) => {
												e.preventDefault();
												submitTyped();
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-xs text-faint",
												htmlFor: "cmd-m",
												children: "Commande écrite"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												id: "cmd-m",
												value: typed,
												onChange: (e) => setTyped(e.target.value),
												placeholder: "enlève la pièce",
												className: "mt-2 h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-faint"
											})]
										})
									]
								}) : null,
								panel === "voix" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "hidden lg:block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-faint",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "size-3.5" }), "Missions"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MissionPanel, {})]
								}) : null,
								panel === "missions" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MissionPanel, {}) : null,
								panel === "sequence" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SequencePanel, {}) : null,
								panel === "oeil" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-medium uppercase tracking-[0.14em] text-faint",
											children: "ESP32-CAM"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeFeed, {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeLink, {})
									]
								}) : null,
								panel === "kit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KitPanel, {}) : null
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceDock, {})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Studio, {});
}
//#endregion
export { Home as component };
