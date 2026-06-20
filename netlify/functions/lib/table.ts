import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8"; // depth

function client(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("Server missing CLAUDE_API_KEY");
  return new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });
}

export type PersonaId = "dramaturge" | "metteur" | "acteur" | "sceptique";
export type TableMode = "notes" | "punch-up" | "sketch";
export type Lang = "fr" | "en";

export interface ProjectContext {
  title: string;
  logline: string;
  language: Lang;
  structure: string;
}

export interface GridContext {
  summary: string;
}

export interface TableRequest {
  project: ProjectContext;
  persona: PersonaId;
  mode: TableMode;
  target?: string;
  selection?: string;
  premise?: string;
  count?: number;
  grid?: GridContext;
  scope?: "scene" | "structure";
}

export interface NoteItem {
  heading: string;
  body: string;
  weight: "légère" | "moyenne" | "forte";
}
export interface RewriteItem {
  angle: string;
  script: string;
}
export interface SketchItem {
  title: string;
  premise: string;
}
export interface TableResult {
  persona: PersonaId;
  mode: TableMode;
  opener: string;
  notes?: NoteItem[];
  rewrites?: RewriteItem[];
  sketches?: SketchItem[];
}

// ── Persona voices — la table (the table-read) ───────────────────────────────
const COMMON = `You are one named member of LA TABLE — the table-read around Le Tréteau, a studio for writing PLAYS FOR THE THEATRE (stage, not screen). You give notes the way a real, opinionated theatre collaborator does at a first read-through: specific, generous but unsparing, always in service of the play on a real stage. You think in entrances and exits, presence, the living stage picture, what an actor can play, what an audience in a room will feel. You never hedge into vagueness and you never flatter. Reference concrete things in the material. Keep each note tight. ALWAYS write in the play's working language: {LANG_NAME}. Stay completely in character. Never mention being an AI. Never use screen/film vocabulary (no "shot", "cut to", "camera", "close-up") — this is the stage.`;

const VOICES: Record<PersonaId, string> = {
  dramaturge: `You are LE DRAMATURGE — the play's structural conscience. You read in objectives, obstacles, tactics, turning points and stakes. You ask of every scene: what does it WANT, what stops it, where does it turn, and what does it owe the whole play? You notice when an act sags, when a scene does a job an earlier one already did, when the dramatic question goes quiet for too long, when a turn is unearned. You speak with calm, exacting authority — an architect reading a load-bearing plan. You love a clean reversal and despise dead air.`,

  metteur: `You are LE METTEUR EN SCÈNE — the director who already sees the stage. You think in bodies in space: who enters, who exits, who is left alone, who holds the room, the tableau the audience reads in one glance. You USE the presence grid — you notice when a character vanishes for a whole act, when the stage is overcrowded, when an entrance lands flat or a key exit is wasted. You care about silence, blocking, the physical life around the words. You speak vividly, practically, like someone staging it tomorrow.`,

  acteur: `You are L'ACTEUR — the one who must say these lines aloud, eight times a week. You read every speech for breath, voice, subtext and playability. You diagnose: this line is unspeakable, this one explains what the body should already show, these two characters sound identical, this monologue dies without an action to play. You quote the writer's own lines back, then sharpen them. You believe the strongest beat is the one a character almost doesn't say. You speak warm but blunt, always from inside the part.`,

  sceptique: `You are LE SCEPTIQUE — the one who stops believing, on purpose, and reports exactly where. You hunt the unearned: the convenient entrance, the character acting against their stated want, stakes asserted but never felt in the room, the logic that only holds if nobody asks. You are not a cynic — you WANT to be convinced — but grant nothing for free. You speak in pointed questions and flat observations. Dry, forensic, allergic to hand-waving.`,
};

const LANG_NAME = (l: Lang) => (l === "fr" ? "French (Québécois-friendly, natural, theatrical register)" : "English");

function buildSystem(persona: PersonaId, lang: Lang): string {
  return `${VOICES[persona]}\n\n${COMMON.replace("{LANG_NAME}", LANG_NAME(lang))}`;
}

// ── Tools ────────────────────────────────────────────────────────────────────
const NOTES_TOOL: Anthropic.Tool = {
  name: "give_notes",
  description: "Return your notes on the material, in your character's voice.",
  input_schema: {
    type: "object",
    required: ["opener", "notes"],
    properties: {
      opener: { type: "string", description: "One opening line in your voice as you give notes at the table." },
      notes: {
        type: "array",
        minItems: 2,
        maxItems: 6,
        items: {
          type: "object",
          required: ["heading", "body", "weight"],
          properties: {
            heading: { type: "string", description: "A short, pointed label (under 8 words)." },
            body: { type: "string", description: "The note, 1-4 sentences, concrete, in character." },
            weight: { type: "string", enum: ["légère", "moyenne", "forte"] },
          },
        },
      },
    },
  },
};

const PUNCHUP_TOOL: Anthropic.Tool = {
  name: "punch_up",
  description: "Return 2-3 alternative rewrites of the selected passage, in stage-play markup.",
  input_schema: {
    type: "object",
    required: ["opener", "rewrites"],
    properties: {
      opener: { type: "string", description: "One line in your voice introducing the rewrites." },
      rewrites: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: {
          type: "object",
          required: ["angle", "script"],
          properties: {
            angle: { type: "string", description: "Short label for this version's angle (e.g. 'Plus sec', 'Tout en sous-texte')." },
            script: {
              type: "string",
              description: "The rewritten passage in STAGE-PLAY markup: CHARACTER cue in ALL CAPS on its own line, dialogue beneath, stage directions in (parentheses). No film terms.",
            },
          },
        },
      },
    },
  },
};

const SKETCH_TOOL: Anthropic.Tool = {
  name: "sketch_scenes",
  description: "Sketch N scene ideas from a premise/logline.",
  input_schema: {
    type: "object",
    required: ["opener", "sketches"],
    properties: {
      opener: { type: "string", description: "One line in your voice." },
      sketches: {
        type: "array",
        minItems: 2,
        maxItems: 8,
        items: {
          type: "object",
          required: ["title", "premise"],
          properties: {
            title: { type: "string", description: "A short evocative scene title / tableau name." },
            premise: { type: "string", description: "2-4 sentences: who is on stage, what they want, the obstacle, the turn." },
          },
        },
      },
    },
  },
};

function ctxBlock(p: ProjectContext): string {
  return [
    `PLAY: ${p.title || "(sans titre)"}`,
    p.logline ? `LOGLINE: ${p.logline}` : "",
    p.structure ? `STRUCTURE: ${p.structure}` : "",
    "",
  ].filter(Boolean).join("\n");
}

export async function runTable(req: TableRequest): Promise<TableResult> {
  const { project, persona, mode } = req;
  const system = buildSystem(persona, project.language);
  const lang = project.language;

  let tool: Anthropic.Tool;
  let userText: string;

  if (mode === "punch-up") {
    tool = PUNCHUP_TOOL;
    userText = [
      ctxBlock(project),
      `Here is the scene (stage-play markup):`,
      "```",
      (req.target ?? "").slice(0, 12_000),
      "```",
      "",
      req.selection
        ? `The writer selected THIS passage to punch up:\n\`\`\`\n${req.selection.slice(0, 4_000)}\n\`\`\``
        : `Punch up the strongest exchange you can find in the scene.`,
      "",
      `Give 2-3 rewrites, each a different angle, in your voice. Respond only by calling punch_up.`,
    ].join("\n");
  } else if (mode === "sketch") {
    tool = SKETCH_TOOL;
    const n = Math.max(2, Math.min(8, req.count ?? 4));
    userText = [
      ctxBlock(project),
      `PREMISE TO RIFF ON:`,
      (req.premise ?? project.logline ?? "").slice(0, 4_000),
      "",
      `Sketch ${n} distinct scene ideas for the stage — varied in tone, stakes, and who is present. Respond only by calling sketch_scenes.`,
    ].join("\n");
  } else {
    tool = NOTES_TOOL;
    const gridLine = req.grid?.summary
      ? `\nPRESENCE GRID (who is on stage, by french-scene):\n${req.grid.summary.slice(0, 4_000)}\n`
      : "";
    userText = [
      ctxBlock(project),
      req.scope === "structure"
        ? `Here is the WHOLE play's structure (acts → scenes with dramaturgy):`
        : `Here is the scene to give notes on:`,
      "```",
      (req.target ?? "").slice(0, 14_000),
      "```",
      gridLine,
      "",
      persona === "metteur" && req.grid?.summary
        ? `Use the presence grid above — call out vanishings, overcrowding, wasted entrances/exits.`
        : "",
      `Give your notes, in character, in ${LANG_NAME(lang)}. Respond only by calling give_notes.`,
    ].filter(Boolean).join("\n");
  }

  // Forced tool-use → DROP thinking; opus REJECTS temperature → omit it.
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 2400,
    system,
    messages: [{ role: "user", content: userText }],
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("No result returned");
  const input = block.input as Record<string, unknown>;
  const opener = String(input.opener ?? "");

  if (mode === "punch-up") {
    const rewrites = (input.rewrites as Record<string, unknown>[] | undefined) ?? [];
    return {
      persona, mode, opener,
      rewrites: rewrites
        .map((r) => ({ angle: String(r.angle ?? ""), script: String(r.script ?? "") }))
        .filter((r) => r.script),
    };
  }
  if (mode === "sketch") {
    const sketches = (input.sketches as Record<string, unknown>[] | undefined) ?? [];
    return {
      persona, mode, opener,
      sketches: sketches
        .map((s) => ({ title: String(s.title ?? ""), premise: String(s.premise ?? "") }))
        .filter((s) => s.premise),
    };
  }
  const notes = (input.notes as Record<string, unknown>[] | undefined) ?? [];
  return {
    persona, mode, opener,
    notes: notes
      .map((n) => ({
        heading: String(n.heading ?? ""),
        body: String(n.body ?? ""),
        weight: (["légère", "moyenne", "forte"].includes(String(n.weight))
          ? String(n.weight)
          : "moyenne") as NoteItem["weight"],
      }))
      .filter((n) => n.body),
  };
}

// ── Breakdown: logline → act→scene structure (forced tool) ───────────────────
export interface BreakdownRequest {
  project: ProjectContext;
  premise: string;
}
export interface BreakdownResult {
  acts: {
    title: string;
    scenes: {
      title: string; setting: string; synopsis: string; dramaticQuestion: string;
      objective: string; obstacle: string; tactic: string; turningPoint: string; stakes: string;
    }[];
  }[];
  characters: { name: string; cue: string; want: string }[];
}

const BREAKDOWN_SYSTEM = `You are the dramaturg-in-residence at Le Tréteau. Given a premise or logline for a STAGE PLAY, you propose a complete act→scene structure with the dramaturgy filled in for each scene (objective, obstacle, tactic, turning point, stakes, the dramatic question, a synopsis, and the setting/décor). You also name the principal characters with a short overall want and an ALL-CAPS cue name for the script. You write for the theatre — bodies on a stage, entrances and exits, not the screen. Keep every field tight and playable. Write everything in the play's working language.`;

const BREAKDOWN_TOOL: Anthropic.Tool = {
  name: "propose_structure",
  description: "Return a proposed act→scene structure with dramaturgy and a principal cast.",
  input_schema: {
    type: "object",
    required: ["acts", "characters"],
    properties: {
      acts: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          required: ["title", "scenes"],
          properties: {
            title: { type: "string", description: "Act title, e.g. 'Acte I — Exposition'." },
            scenes: {
              type: "array",
              minItems: 1,
              maxItems: 6,
              items: {
                type: "object",
                required: ["title", "synopsis", "objective", "obstacle", "turningPoint", "stakes", "dramaticQuestion"],
                properties: {
                  title: { type: "string", description: "Scene/tableau title." },
                  setting: { type: "string", description: "Place / décor." },
                  synopsis: { type: "string", description: "1-3 sentences of what happens." },
                  dramaticQuestion: { type: "string", description: "The scene's dramatic question." },
                  objective: { type: "string", description: "What the scene's protagonist wants here." },
                  obstacle: { type: "string", description: "What stands in the way." },
                  tactic: { type: "string", description: "The tactic(s) used to pursue the objective." },
                  turningPoint: { type: "string", description: "The reversal / turn in the scene." },
                  stakes: { type: "string", description: "What's at risk." },
                },
              },
            },
          },
        },
      },
      characters: {
        type: "array",
        minItems: 2,
        maxItems: 10,
        items: {
          type: "object",
          required: ["name", "cue", "want"],
          properties: {
            name: { type: "string" },
            cue: { type: "string", description: "ALL-CAPS cue name for the script." },
            want: { type: "string", description: "The character's overall driving want." },
          },
        },
      },
    },
  },
};

export async function runBreakdown(req: BreakdownRequest): Promise<BreakdownResult> {
  const { project, premise } = req;
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: BREAKDOWN_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ctxBlock(project),
          `WORKING LANGUAGE: ${LANG_NAME(project.language)}`,
          project.structure ? `Preferred structure: ${project.structure}` : "",
          "",
          `PREMISE / LOGLINE:`,
          premise.slice(0, 4_000),
          "",
          `Propose the full act→scene structure with dramaturgy and a principal cast. Respond only by calling propose_structure.`,
        ].filter(Boolean).join("\n"),
      },
    ],
    tools: [BREAKDOWN_TOOL],
    tool_choice: { type: "tool", name: "propose_structure" },
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("No result returned");
  const input = block.input as Record<string, unknown>;
  const acts = ((input.acts as Record<string, unknown>[] | undefined) ?? []).map((a) => ({
    title: String(a.title ?? ""),
    scenes: ((a.scenes as Record<string, unknown>[] | undefined) ?? []).map((s) => ({
      title: String(s.title ?? ""),
      setting: String(s.setting ?? ""),
      synopsis: String(s.synopsis ?? ""),
      dramaticQuestion: String(s.dramaticQuestion ?? ""),
      objective: String(s.objective ?? ""),
      obstacle: String(s.obstacle ?? ""),
      tactic: String(s.tactic ?? ""),
      turningPoint: String(s.turningPoint ?? ""),
      stakes: String(s.stakes ?? ""),
    })),
  }));
  const characters = ((input.characters as Record<string, unknown>[] | undefined) ?? []).map((c) => ({
    name: String(c.name ?? ""),
    cue: String(c.cue ?? "").toUpperCase(),
    want: String(c.want ?? ""),
  }));
  return { acts, characters };
}
