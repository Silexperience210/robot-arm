import type { JointId, VoiceCommand } from "./types";

const NUM_WORDS: Record<string, number> = {
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
  cent: 100,
};

function fold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9%.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function magnitude(t: string): number {
  if (/\ba fond\b|\bau max\b|\btotalement\b|\bcompletement\b|\bfull\b/.test(t)) return 90;
  if (/\bbeaucoup\b|\bgrand\b|\bfort\b|\blarge\b/.test(t)) return 28;
  if (/\bun petit peu\b|\btres peu\b|\bdoucement\b|\blegerement\b/.test(t)) return 6;
  if (/\bun peu\b|\blegerement\b|\bun chouia\b/.test(t)) return 10;
  return 16;
}

function parseNumber(t: string): number | null {
  const m = t.match(/(-?\d+(?:[.,]\d+)?)/);
  if (m) return Number(m[1].replace(",", "."));
  for (const [w, n] of Object.entries(NUM_WORDS)) {
    if (t.includes(w)) return n;
  }
  return null;
}

function jointFrom(t: string): JointId | null {
  if (/\bpince\b|\bgriffe\b|\bgripper\b|\bmachoire/.test(t)) return "grip";
  if (/\bpoignet\b|\bwrist\b|\bmain\b|\binclin/.test(t)) return "wrist";
  if (/\bcoude\b|\belbow\b/.test(t)) return "elbow";
  if (/\bepaule\b|\bshoulder\b|\bbras\b/.test(t)) return "shoulder";
  if (/\bbase\b|\bsocle\b|\btourner\b|\brotation\b|\byaw\b/.test(t)) return "base";
  return null;
}

function deltaMeters(t: string, mag: number): number {
  const cm = t.match(/(-?\d+(?:[.,]\d+)?)\s*cm/);
  if (cm) return Number(cm[1].replace(",", ".")) * 0.01;
  const mm = t.match(/(-?\d+(?:[.,]\d+)?)\s*mm/);
  if (mm) return Number(mm[1].replace(",", ".")) * 0.001;
  return mag * 0.0014;
}

const MISSION_ALIASES: { id: string; re: RegExp }[] = [
  { id: "color", re: /\b(trie par couleur|triage couleur|classe les pieces|trie tout|couleur)\b/ },
  { id: "pickup", re: /\b(enleve|decolle|retire|ramasse|prend|attrape|recupere).*(piece|impression|print|cube|objet)|fin d.?impression|print done|decharge/ },
  { id: "inspect", re: /\b(inspecte|inspection|photo|cadre)\b/ },
  { id: "hold", re: /\b(maintien|maintiens|tiens|hold|serre et tiens)\b/ },
  { id: "scan", re: /\b(scan|balaye|ultrason|mesure)\b/ },
  { id: "wave", re: /\b(salue|bonjour|demo|vague|wave)\b/ },
  { id: "park", re: /\b(park|garage|range le bras|repli)\b/ },
];

export const VOICE_EXAMPLES = [
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
  "rejoue",
];

export function parseVoice(raw: string): VoiceCommand | null {
  const t = fold(raw);
  if (!t || t.length < 2) return null;

  if (/\b(stop|arret|arrete|halte|freeze|pause|immobil)\b/.test(t)) {
    return { kind: "stop" };
  }
  if (/\b(oeil|camera|vision)\b/.test(t) || /montre l.?oeil|montre la camera/.test(t)) {
    return { kind: "eye" };
  }
  if (/\b(repose|replace|reset piece|nouvelle piece|remet la piece|reinitialise)\b/.test(t)) {
    return { kind: "reset" };
  }
  if (/\b(vise|regarde la piece|pointe la piece|look)\b/.test(t)) {
    return { kind: "look" };
  }
  if (/\b(attrape|agrippe|grab|prends ca)\b/.test(t) && !/\bimpression\b/.test(t)) {
    return { kind: "grab" };
  }
  if (/\b(aide|help|commandes|que dire)\b/.test(t)) return { kind: "help" };
  if (/\b(home|repos|origine|neutre|position initiale)\b/.test(t) && !/\bpiece\b/.test(t)) {
    return { kind: "home" };
  }
  if (/\b(enregistre|sauvegarde|waypoint|capture la position)\b/.test(t)) {
    return { kind: "record" };
  }
  if (/\b(rejoue|joue|execute|lance la sequence|replay)\b/.test(t)) {
    return { kind: "play" };
  }
  if (/\b(efface|vide la sequence|clear)\b/.test(t)) return { kind: "clear" };

  if (/\b(va au plateau|vers le plateau|au lit|sur le bed)\b/.test(t)) {
    return { kind: "goto", place: "bed" };
  }
  if (/\b(bac gauche|bin gauche|a gauche le bac)\b/.test(t)) return { kind: "goto", place: "binL" };
  if (/\b(bac droit|bin droit)\b/.test(t)) return { kind: "goto", place: "binR" };

  if (/\bplus vite\b|\baccelere\b|\bfaster\b/.test(t)) return { kind: "speed", value: 1 };
  if (/\bplus lent\b|\bralenti\b|\bdoucement\b|\bslower\b/.test(t) && !jointFrom(t)) {
    return { kind: "speed", value: 0.35 };
  }
  if (/\bvitesse/.test(t)) {
    const n = parseNumber(t);
    if (n != null) return { kind: "speed", value: n > 1 ? n / 100 : n };
  }

  for (const m of MISSION_ALIASES) {
    if (m.re.test(t)) return { kind: "mission", id: m.id };
  }

  if (/\b(ouvre|open)\b/.test(t) && (/\bpince\b|\bgriffe\b|$/.test(t) || !jointFrom(t))) {
    if (!/\bcoude\b|\bepaule\b|\bpoignet\b/.test(t)) {
      const n = parseNumber(t);
      if (n != null && t.includes("degre")) {
        return { kind: "set", joint: "grip", value: n };
      }
      return { kind: "set", joint: "grip", value: t.includes("un peu") ? 55 : 88 };
    }
  }
  if (/\b(ferme|close|serre)\b/.test(t) && !/\bcoude\b/.test(t)) {
    return { kind: "set", joint: "grip", value: t.includes("un peu") ? 28 : 4 };
  }

  const joint = jointFrom(t);
  const numbered = parseNumber(t);
  if (joint && numbered != null && /\bdegre|%|pour ?cent|a \d/.test(t)) {
    if (joint === "grip" && (t.includes("%") || t.includes("pourcent"))) {
      return { kind: "set", joint, value: (numbered / 100) * 90 };
    }
    return { kind: "set", joint, value: numbered };
  }
  if (joint && numbered != null && t.split(" ").length <= 4) {
    return { kind: "set", joint, value: numbered };
  }

  const mag = magnitude(t);
  const meters = deltaMeters(t, mag);

  if (/\b(avance|forward|approche)\b/.test(t)) {
    return { kind: "cartesian", axis: "z", delta: meters };
  }
  if (/\b(recule|arriere|eloigne|back)\b/.test(t)) {
    return { kind: "cartesian", axis: "z", delta: -meters };
  }
  if (
    /\b(va a gauche|a gauche|translata?e gauche|slide left)\b/.test(t) ||
    (/\bgauche\b/.test(t) && !/\bbase\b|\btourne\b|\brotation\b|\bbac\b/.test(t))
  ) {
    if (!/\btourne\b|\bpivot\b|\bbase\b/.test(t)) {
      return { kind: "cartesian", axis: "x", delta: -meters };
    }
  }
  if (
    /\b(va a droite|a droite|slide right)\b/.test(t) ||
    (/\bdroite\b/.test(t) && !/\btourne\b|\bbase\b|\bbac\b/.test(t))
  ) {
    return { kind: "cartesian", axis: "x", delta: meters };
  }
  if (/\b(monte|leve|higher|up)\b/.test(t) && !/\bepaule\b|\bbas\b/.test(t)) {
    if (/\bpince\b|\boutil\b|\bcartesien\b|\bout\b/.test(t) || !/\bbras\b|\bepaule\b/.test(t)) {
      if (/\bpince\b|\boutil\b|\bpointe\b/.test(t) || /\bmonte\b/.test(t)) {
        return { kind: "cartesian", axis: "y", delta: meters };
      }
    }
  }
  if (/\b(descend|baisse|lower|down)\b/.test(t) && /\bpince\b|\boutil\b|\bpointe\b/.test(t)) {
    return { kind: "cartesian", axis: "y", delta: -meters };
  }

  if (/\b(tourne|pivot|rotation|base)\b/.test(t) || (/\bgauche\b|\bdroite\b/.test(t) && /\bbas(e)?\b/.test(t))) {
    const dir = /\bdroite\b|\bright\b/.test(t) ? 1 : -1;
    return { kind: "nudge", joint: "base", delta: dir * mag };
  }
  if (
    /\b(leve le bras|baisse le bras|epaule|shoulder)\b/.test(t) ||
    (/\bleve\b|\bbaisse\b/.test(t) && !/\bcoude\b|\bpoignet\b|\bpince\b/.test(t))
  ) {
    const dir = /\bbaisse\b|\bdescend\b/.test(t) ? -1 : 1;
    return { kind: "nudge", joint: "shoulder", delta: dir * mag };
  }
  if (/\bcoude\b|\belbow\b/.test(t)) {
    const dir = /\b(moins|ferme|plie|repli)\b/.test(t) ? -1 : 1;
    return { kind: "nudge", joint: "elbow", delta: dir * mag };
  }
  if (/\bpoignet\b|\bwrist\b|\bincline\b/.test(t)) {
    const dir = /\b(bas|baisse|descend)\b/.test(t) ? -1 : 1;
    return { kind: "nudge", joint: "wrist", delta: dir * mag };
  }
  if (/\bpince\b/.test(t) && /\b(plus|moins|ouvre|ferme)\b/.test(t)) {
    const dir = /\bferme\b|\bmoins\b/.test(t) ? -1 : 1;
    return { kind: "nudge", joint: "grip", delta: dir * mag };
  }

  if (/\b(gauche)\b/.test(t)) return { kind: "nudge", joint: "base", delta: -mag };
  if (/\b(droite)\b/.test(t)) return { kind: "nudge", joint: "base", delta: mag };
  if (/\b(monte|leve)\b/.test(t)) return { kind: "cartesian", axis: "y", delta: meters };
  if (/\b(descend|baisse)\b/.test(t)) return { kind: "cartesian", axis: "y", delta: -meters };

  if (t.length >= 12) return { kind: "ai", text: raw.trim() };
  return null;
}

export function describeCommand(cmd: VoiceCommand): string {
  switch (cmd.kind) {
    case "nudge":
      return `${cmd.joint} ${cmd.delta > 0 ? "+" : ""}${Math.round(cmd.delta)}°`;
    case "set":
      return `${cmd.joint} → ${Math.round(cmd.value)}°`;
    case "cartesian":
      return `outil ${cmd.axis} ${cmd.delta > 0 ? "+" : ""}${(cmd.delta * 1000).toFixed(0)} mm`;
    case "stop":
      return "arrêt";
    case "speed":
      return `vitesse ${Math.round(cmd.value * 100)}%`;
    case "mission":
      return `mission ${cmd.id}`;
    case "home":
      return "position home";
    case "record":
      return "waypoint enregistré";
    case "play":
      return "lecture séquence";
    case "clear":
      return "séquence effacée";
    case "help":
      return "commandes vocales";
    case "eye":
      return "œil ESP32-CAM";
    case "look":
      return "viser la pièce";
    case "reset":
      return "atelier réinitialisé";
    case "goto":
      return `goto ${cmd.place}`;
    case "grab":
      return "prise automatique";
    case "ai":
      return "planification";
  }
}