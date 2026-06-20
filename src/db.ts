import Dexie, { type Table } from "dexie";
import type {
  Act,
  Beat,
  CastColor,
  Character,
  Lang,
  Note,
  Presence,
  Project,
  Scene,
  Settings,
  StructureId,
} from "./types";
import { getTemplate } from "./structures";

class TreteauDB extends Dexie {
  projects!: Table<Project, number>;
  acts!: Table<Act, number>;
  scenes!: Table<Scene, number>;
  characters!: Table<Character, number>;
  presence!: Table<Presence, number>;
  beats!: Table<Beat, number>;
  notes!: Table<Note, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super("le-treteau");
    this.version(1).stores({
      projects: "++id, updatedAt, createdAt",
      acts: "++id, projectId, order",
      scenes: "++id, projectId, actId, order, updatedAt",
      characters: "++id, projectId, order",
      presence: "++id, projectId, sceneId, characterId, at",
      beats: "++id, projectId, actId, order, sceneId",
      notes: "++id, projectId, sceneId, persona, dismissed, createdAt",
      settings: "++id",
    });
  }
}

export const db = new TreteauDB();

export const CAST_COLORS: CastColor[] = [
  "crimson", "amber", "gold", "olive", "jade", "teal",
  "cobalt", "indigo", "plum", "rose", "slate", "rust",
];

export function nextColor(used: CastColor[]): CastColor {
  for (const c of CAST_COLORS) if (!used.includes(c)) return c;
  return CAST_COLORS[used.length % CAST_COLORS.length];
}

// ── Settings ───────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: Settings = { onboarded: false, theme: "dark" };

export async function readSettings(): Promise<Settings> {
  const existing = await db.settings.toCollection().first();
  return existing ?? { ...DEFAULT_SETTINGS };
}

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.toCollection().first();
  if (existing) return existing;
  const id = await db.settings.add({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, id };
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  const s = await ensureSettings();
  await db.settings.update(s.id!, patch);
}

// ── Projects ─────────────────────────────────────────────────────────────────
export interface NewProjectInput {
  title: string;
  logline: string;
  author: string;
  language: Lang;
  structure: StructureId;
}

/** Create a project and seed acts + a beat board from the chosen structure. */
export async function createProject(input: NewProjectInput): Promise<number> {
  const now = Date.now();
  return db.transaction("rw", db.projects, db.acts, db.beats, async () => {
    const projectId = await db.projects.add({ ...input, createdAt: now, updatedAt: now });
    const tpl = getTemplate(input.structure);
    const lang = input.language;
    const actIds: number[] = [];
    for (let i = 0; i < tpl.acts.length; i++) {
      const id = await db.acts.add({
        projectId,
        order: i,
        title: tpl.acts[i][lang],
        createdAt: now + i,
      });
      actIds.push(id);
    }
    let order = 0;
    for (const b of tpl.beats) {
      await db.beats.add({
        projectId,
        actId: actIds[b.actIndex],
        order: order++,
        title: b.title[lang],
        summary: b.summary[lang],
        color: b.color,
        createdAt: now + 100 + order,
      });
    }
    return projectId;
  });
}

export async function updateProject(id: number, patch: Partial<Project>): Promise<void> {
  await db.projects.update(id, { ...patch, updatedAt: Date.now() });
}

export async function touchProject(id: number): Promise<void> {
  await db.projects.update(id, { updatedAt: Date.now() });
}

export async function deleteProject(id: number): Promise<void> {
  await db.transaction(
    "rw",
    [db.projects, db.acts, db.scenes, db.characters, db.presence, db.beats, db.notes],
    async () => {
      await db.acts.where("projectId").equals(id).delete();
      await db.scenes.where("projectId").equals(id).delete();
      await db.characters.where("projectId").equals(id).delete();
      await db.presence.where("projectId").equals(id).delete();
      await db.beats.where("projectId").equals(id).delete();
      await db.notes.where("projectId").equals(id).delete();
      await db.projects.delete(id);
    },
  );
}

// ── Acts ─────────────────────────────────────────────────────────────────────
export async function addAct(projectId: number, title: string): Promise<number> {
  const existing = await db.acts.where("projectId").equals(projectId).toArray();
  const maxOrder = existing.reduce((m, a) => Math.max(m, a.order), -1);
  const id = await db.acts.add({ projectId, order: maxOrder + 1, title, createdAt: Date.now() });
  await touchProject(projectId);
  return id;
}

export async function updateAct(id: number, patch: Partial<Act>): Promise<void> {
  await db.acts.update(id, patch);
  const a = await db.acts.get(id);
  if (a) await touchProject(a.projectId);
}

/** Delete an act and cascade: its scenes (and their presence), unlink beats. */
export async function deleteAct(id: number): Promise<void> {
  const act = await db.acts.get(id);
  if (!act) return;
  await db.transaction("rw", [db.acts, db.scenes, db.presence, db.beats, db.notes], async () => {
    const scenes = await db.scenes.where("actId").equals(id).toArray();
    for (const s of scenes) {
      await db.presence.where("sceneId").equals(s.id!).delete();
      await db.notes.where("sceneId").equals(s.id!).delete();
    }
    await db.scenes.where("actId").equals(id).delete();
    const beats = await db.beats.where("actId").equals(id).toArray();
    for (const b of beats) await db.beats.update(b.id!, { actId: undefined });
    await db.acts.delete(id);
  });
  await touchProject(act.projectId);
}

// ── Scenes ───────────────────────────────────────────────────────────────────
export async function addScene(projectId: number, actId: number, partial?: Partial<Scene>): Promise<number> {
  const existing = await db.scenes.where("actId").equals(actId).toArray();
  const maxOrder = existing.reduce((m, s) => Math.max(m, s.order), -1);
  const id = await db.scenes.add({
    projectId,
    actId,
    order: maxOrder + 1,
    title: partial?.title ?? "",
    setting: partial?.setting ?? "",
    synopsis: partial?.synopsis ?? "",
    dramaticQuestion: partial?.dramaticQuestion ?? "",
    objective: partial?.objective ?? "",
    obstacle: partial?.obstacle ?? "",
    tactic: partial?.tactic ?? "",
    turningPoint: partial?.turningPoint ?? "",
    stakes: partial?.stakes ?? "",
    script: partial?.script ?? "",
    color: partial?.color ?? "gold",
    updatedAt: Date.now(),
    ...partial,
  });
  await touchProject(projectId);
  return id;
}

export async function updateScene(id: number, patch: Partial<Scene>): Promise<void> {
  await db.scenes.update(id, { ...patch, updatedAt: Date.now() });
  const s = await db.scenes.get(id);
  if (s) await touchProject(s.projectId);
}

export async function deleteScene(id: number): Promise<void> {
  const s = await db.scenes.get(id);
  await db.transaction("rw", [db.scenes, db.presence, db.beats, db.notes], async () => {
    await db.presence.where("sceneId").equals(id).delete();
    await db.notes.where("sceneId").equals(id).delete();
    const linked = await db.beats.where("sceneId").equals(id).toArray();
    for (const b of linked) await db.beats.update(b.id!, { sceneId: undefined });
    await db.scenes.delete(id);
  });
  if (s) await touchProject(s.projectId);
}

export async function reorderScenes(ordered: { id: number; actId: number }[]): Promise<void> {
  await db.transaction("rw", db.scenes, async () => {
    // order within each act
    const counters = new Map<number, number>();
    for (const { id, actId } of ordered) {
      const o = counters.get(actId) ?? 0;
      await db.scenes.update(id, { order: o, actId });
      counters.set(actId, o + 1);
    }
  });
}

// ── Characters ───────────────────────────────────────────────────────────────
export async function addCharacter(projectId: number, partial?: Partial<Character>): Promise<number> {
  // Compute order + color atomically inside a transaction so rapid successive
  // adds (e.g. the AI breakdown, or quick clicks) don't all read the same stale
  // snapshot and collide on the same colour/order.
  const id = await db.transaction("rw", db.characters, async () => {
    const existing = await db.characters.where("projectId").equals(projectId).toArray();
    const maxOrder = existing.reduce((m, c) => Math.max(m, c.order), -1);
    const color = partial?.color ?? nextColor(existing.map((c) => c.color));
    return db.characters.add({
      projectId,
      order: maxOrder + 1,
      name: partial?.name ?? "",
      cue: partial?.cue ?? "",
      bio: partial?.bio ?? "",
      want: partial?.want ?? "",
      relationships: partial?.relationships ?? "",
      color,
      createdAt: Date.now(),
      ...partial,
    });
  });
  await touchProject(projectId);
  return id;
}

export async function updateCharacter(id: number, patch: Partial<Character>): Promise<void> {
  await db.characters.update(id, patch);
  const c = await db.characters.get(id);
  if (c) await touchProject(c.projectId);
}

export async function deleteCharacter(id: number): Promise<void> {
  const c = await db.characters.get(id);
  await db.transaction("rw", db.characters, db.presence, async () => {
    await db.presence.where("characterId").equals(id).delete();
    await db.characters.delete(id);
  });
  if (c) await touchProject(c.projectId);
}

// ── Presence (entrances / exits) ─────────────────────────────────────────────
export async function addPresence(
  projectId: number,
  sceneId: number,
  characterId: number,
  kind: "enter" | "exit",
  at: number,
  note?: string,
): Promise<number> {
  const id = await db.presence.add({
    projectId, sceneId, characterId, kind, at, note, createdAt: Date.now(),
  });
  await touchProject(projectId);
  return id;
}

export async function updatePresence(id: number, patch: Partial<Presence>): Promise<void> {
  await db.presence.update(id, patch);
  const p = await db.presence.get(id);
  if (p) await touchProject(p.projectId);
}

export async function deletePresence(id: number): Promise<void> {
  const p = await db.presence.get(id);
  await db.presence.delete(id);
  if (p) await touchProject(p.projectId);
}

// ── Beats ────────────────────────────────────────────────────────────────────
export async function addBeat(projectId: number, actId: number | undefined, partial?: Partial<Beat>): Promise<number> {
  const existing = await db.beats.where("projectId").equals(projectId).toArray();
  const maxOrder = existing.reduce((m, b) => Math.max(m, b.order), -1);
  const id = await db.beats.add({
    projectId,
    actId,
    order: maxOrder + 1,
    title: partial?.title ?? "",
    summary: partial?.summary ?? "",
    color: partial?.color ?? "gold",
    createdAt: Date.now(),
    ...partial,
  });
  await touchProject(projectId);
  return id;
}

export async function updateBeat(id: number, patch: Partial<Beat>): Promise<void> {
  await db.beats.update(id, patch);
  const b = await db.beats.get(id);
  if (b) await touchProject(b.projectId);
}

export async function deleteBeat(id: number): Promise<void> {
  const b = await db.beats.get(id);
  await db.beats.delete(id);
  if (b) await touchProject(b.projectId);
}

export async function reorderBeats(ordered: { id: number; actId?: number }[]): Promise<void> {
  await db.transaction("rw", db.beats, async () => {
    let order = 0;
    for (const { id, actId } of ordered) await db.beats.update(id, { order: order++, actId });
  });
}

/** Promote a beat into a real scene in the given act (or its current act). */
export async function beatToScene(beatId: number, fallbackActId: number): Promise<number> {
  const beat = await db.beats.get(beatId);
  if (!beat) throw new Error("Beat introuvable");
  if (beat.sceneId) {
    const existing = await db.scenes.get(beat.sceneId);
    if (existing) return beat.sceneId;
  }
  const actId = beat.actId ?? fallbackActId;
  const sceneId = await addScene(beat.projectId, actId, {
    title: beat.title,
    synopsis: beat.summary,
    color: beat.color,
  });
  await db.beats.update(beatId, { sceneId });
  return sceneId;
}

// ── Notes ────────────────────────────────────────────────────────────────────
export async function addNote(note: Omit<Note, "id" | "createdAt">): Promise<number> {
  const id = await db.notes.add({ ...note, createdAt: Date.now() });
  return id;
}

export async function dismissNote(id: number): Promise<void> {
  await db.notes.update(id, { dismissed: 1 });
}

export async function deleteNote(id: number): Promise<void> {
  await db.notes.delete(id);
}
