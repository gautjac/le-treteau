import type { Lang, PersonaId, TableMode } from "./types";

export interface ProjectContext {
  title: string;
  logline: string;
  language: Lang;
  structure: string;
}

/** A compact textual snapshot of the presence grid, fed to the dramaturg. */
export interface GridContext {
  /** rows: "CHARACTER — present in N/total french-scenes; longest absence M" */
  summary: string;
}

export interface NoteItem {
  heading: string;
  body: string;
  weight: "légère" | "moyenne" | "forte";
}

export interface SketchItem {
  title: string;
  premise: string;
}

export interface RewriteItem {
  angle: string;
  script: string;
}

export interface TableResult {
  persona: PersonaId;
  mode: TableMode;
  opener: string;
  notes?: NoteItem[];
  rewrites?: RewriteItem[];
  sketches?: SketchItem[];
}

export interface TableRequest {
  project: ProjectContext;
  persona: PersonaId;
  mode: TableMode;
  /** Notes/punch-up target (a scene's script or its dramaturgy summary). */
  target?: string;
  /** Punch-up: the selected passage. */
  selection?: string;
  /** Sketch: the premise/logline to riff scenes from; count of ideas. */
  premise?: string;
  count?: number;
  /** Presence-grid context for structural notes. */
  grid?: GridContext;
  /** Whether the target is a whole-structure overview or a single scene. */
  scope?: "scene" | "structure";
}

// ── breakdown ───────────────────────────────────────────────────────────────
export interface BreakdownScene {
  title: string;
  setting: string;
  synopsis: string;
  dramaticQuestion: string;
  objective: string;
  obstacle: string;
  tactic: string;
  turningPoint: string;
  stakes: string;
}
export interface BreakdownAct {
  title: string;
  scenes: BreakdownScene[];
}
export interface BreakdownCharacter {
  name: string;
  cue: string;
  want: string;
}
export interface BreakdownResult {
  acts: BreakdownAct[];
  characters: BreakdownCharacter[];
}

export interface BreakdownRequest {
  project: ProjectContext;
  premise: string;
}

/**
 * NDJSON keepalive: the server emits bare-newline heartbeats during the long
 * Opus generation, then a final JSON line ({ result } shape unwrapped here, or
 * { error }). We read to end-of-stream and parse the last non-empty line.
 */
async function readResult<T>(res: Response): Promise<T> {
  const raw = await res.text();
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  let parsed: (T & { error?: string }) | null = null;
  try {
    parsed = last ? (JSON.parse(last) as T & { error?: string }) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) throw new Error(parsed?.error || `Erreur ${res.status}`);
  if (!parsed) throw new Error("Réponse invalide du serveur.");
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

async function post<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readResult<T>(res);
}

export function fetchTable(req: TableRequest): Promise<TableResult> {
  return post<TableResult>("/api/dramaturge", req);
}

export function fetchBreakdown(req: BreakdownRequest): Promise<BreakdownResult> {
  return post<BreakdownResult>("/api/breakdown", req);
}
