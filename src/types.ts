export type Lang = "fr" | "en";

/** Structural templates for the beat board / act layout. */
export type StructureId = "three-act" | "five-act" | "french-classical" | "free";

/** Theatre dramaturg personas (la table — the table-read). */
export type PersonaId = "dramaturge" | "metteur" | "acteur" | "sceptique";

export type TableMode = "notes" | "punch-up" | "sketch";

/** Cast accent pigments (match tailwind `cast.*`). */
export type CastColor =
  | "crimson"
  | "amber"
  | "gold"
  | "olive"
  | "jade"
  | "teal"
  | "cobalt"
  | "indigo"
  | "plum"
  | "rose"
  | "slate"
  | "rust";

export interface Project {
  id?: number;
  title: string;
  logline: string;
  author: string;
  /** UI-independent working language: drives AI output + exported script. */
  language: Lang;
  structure: StructureId;
  createdAt: number;
  updatedAt: number;
}

/** An act (the top of the hierarchy). */
export interface Act {
  id?: number;
  projectId: number;
  order: number;
  /** e.g. "Acte I" / "Act I" — editable by the writer. */
  title: string;
  createdAt: number;
}

/** A scene / tableau, child of an act. Holds dramaturgy + the script. */
export interface Scene {
  id?: number;
  projectId: number;
  actId: number;
  order: number; // order within the act
  title: string; // "Scène 1" / a tableau name
  setting: string; // place / décor
  /** Dramaturgy — action-analysis fields. */
  synopsis: string;
  dramaticQuestion: string;
  objective: string;
  obstacle: string;
  tactic: string;
  turningPoint: string;
  stakes: string;
  /** The script body, in our stage-play markup (see lib/stageplay). */
  script: string;
  color: CastColor; // tile accent for the board
  updatedAt: number;
}

/** A character in the cast. Feeds the presence grid + AI. */
export interface Character {
  id?: number;
  projectId: number;
  order: number;
  name: string;
  /** short cue name used in the script (caps), e.g. "HÉLÈNE". */
  cue: string;
  bio: string;
  want: string; // the character's overall objective
  relationships: string;
  color: CastColor;
  createdAt: number;
}

/**
 * A presence event: a character ENTERS or EXITS at a point on a scene's
 * timeline. The french-scene divisions are COMPUTED from these.
 * `at` is a fractional position 0..1 along the scene (sortable; the writer can
 * reorder by nudging). Entrance/exit toggles who is on stage.
 */
export type PresenceKind = "enter" | "exit";

export interface Presence {
  id?: number;
  projectId: number;
  sceneId: number;
  characterId: number;
  kind: PresenceKind;
  at: number; // 0..1 ordering key within the scene
  /** optional note, e.g. "par le jardin" */
  note?: string;
  createdAt: number;
}

/** A beat / index card on the structure board (optional planning layer). */
export interface Beat {
  id?: number;
  projectId: number;
  actId?: number; // which act column it lives in
  order: number; // global drag order
  title: string;
  summary: string;
  color: CastColor;
  sceneId?: number; // linked scene
  createdAt: number;
}

export interface Note {
  id?: number;
  projectId: number;
  sceneId?: number;
  persona: PersonaId;
  mode: TableMode;
  /** notes: markdown-ish; punch-up/sketch: serialized JSON. */
  body: string;
  target?: string;
  dismissed?: number;
  createdAt: number;
}

export interface Settings {
  id?: number;
  onboarded: boolean;
  activeProjectId?: number;
  theme?: "light" | "dark";
}
