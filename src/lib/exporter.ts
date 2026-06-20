import { db } from "../db";
import type { Act, Beat, Character, Note, Presence, Project, Scene } from "../types";
import { toPlainText } from "./stageplay";

// ── Script export (plain text / markdown) ────────────────────────────────────
export interface FullProject {
  project: Project;
  acts: Act[];
  scenes: Scene[];
  characters: Character[];
}

/** Assemble the whole play into one document, in act→scene order. */
export function toScript(full: FullProject, opts: { markdown?: boolean } = {}): string {
  const md = opts.markdown ?? false;
  const { project, acts, scenes, characters } = full;
  const lang = project.language;
  const out: string[] = [];

  // Title page
  out.push(md ? `# ${project.title || "Sans titre"}` : (project.title || "Sans titre").toUpperCase());
  if (project.author) out.push("", lang === "fr" ? `de ${project.author}` : `by ${project.author}`);
  if (project.logline) out.push("", md ? `*${project.logline}*` : project.logline);

  // Dramatis personae
  if (characters.length) {
    out.push("", md ? `## ${lang === "fr" ? "Personnages" : "Characters"}` : (lang === "fr" ? "PERSONNAGES" : "CHARACTERS"), "");
    for (const c of [...characters].sort((a, b) => a.order - b.order)) {
      const line = c.bio ? `${c.name} — ${c.bio}` : c.name;
      out.push(md ? `- **${c.name}**${c.bio ? ` — ${c.bio}` : ""}` : line);
    }
  }

  const sortedActs = [...acts].sort((a, b) => a.order - b.order);
  for (const act of sortedActs) {
    out.push("", md ? `# ${act.title}` : act.title.toUpperCase(), "");
    const actScenes = scenes
      .filter((s) => s.actId === act.id)
      .sort((a, b) => a.order - b.order);
    for (const sc of actScenes) {
      const header = sc.setting ? `${sc.title} — ${sc.setting}` : sc.title;
      out.push(md ? `## ${header}` : header, "");
      if (sc.script.trim()) {
        out.push(toPlainText(sc.script, { markdown: md }).trim(), "");
      } else if (sc.synopsis) {
        out.push(md ? `*(${sc.synopsis})*` : `(${sc.synopsis})`, "");
      }
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ── JSON backup / import (round-trip) ────────────────────────────────────────
export interface ProjectBackup {
  app: "le-treteau";
  version: 1;
  exportedAt: number;
  project: Omit<Project, "id">;
  acts: Omit<Act, "id" | "projectId">[];
  scenes: (Omit<Scene, "id" | "projectId" | "actId"> & { actIndex: number })[];
  characters: Omit<Character, "id" | "projectId">[];
  presence: (Omit<Presence, "id" | "projectId" | "sceneId" | "characterId"> & {
    sceneIndex: number;
    characterIndex: number;
  })[];
  beats: (Omit<Beat, "id" | "projectId" | "actId" | "sceneId"> & {
    actIndex: number | null;
    sceneIndex: number | null;
  })[];
  notes: Omit<Note, "id" | "projectId" | "sceneId">[];
}

export async function exportProjectJSON(projectId: number): Promise<ProjectBackup> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error("Projet introuvable");
  const acts = (await db.acts.where("projectId").equals(projectId).toArray()).sort((a, b) => a.order - b.order);
  const scenes = (await db.scenes.where("projectId").equals(projectId).toArray()).sort((a, b) => a.order - b.order);
  const characters = (await db.characters.where("projectId").equals(projectId).toArray()).sort((a, b) => a.order - b.order);
  const presence = await db.presence.where("projectId").equals(projectId).toArray();
  const beats = (await db.beats.where("projectId").equals(projectId).toArray()).sort((a, b) => a.order - b.order);
  const notes = await db.notes.where("projectId").equals(projectId).toArray();

  const actIndex = new Map<number, number>();
  acts.forEach((a, i) => actIndex.set(a.id!, i));
  const sceneIndex = new Map<number, number>();
  scenes.forEach((s, i) => sceneIndex.set(s.id!, i));
  const charIndex = new Map<number, number>();
  characters.forEach((c, i) => charIndex.set(c.id!, i));

  const { id: _pid, ...proj } = project;
  void _pid;

  return {
    app: "le-treteau",
    version: 1,
    exportedAt: Date.now(),
    project: proj,
    acts: acts.map(({ id, projectId: _p, ...rest }) => { void id; void _p; return rest; }),
    scenes: scenes.map(({ id, projectId: _p, actId, ...rest }) => {
      void id; void _p;
      return { ...rest, actIndex: actIndex.get(actId) ?? 0 };
    }),
    characters: characters.map(({ id, projectId: _p, ...rest }) => { void id; void _p; return rest; }),
    presence: presence.map(({ id, projectId: _p, sceneId, characterId, ...rest }) => {
      void id; void _p;
      return { ...rest, sceneIndex: sceneIndex.get(sceneId) ?? -1, characterIndex: charIndex.get(characterId) ?? -1 };
    }).filter((p) => p.sceneIndex >= 0 && p.characterIndex >= 0),
    beats: beats.map(({ id, projectId: _p, actId, sceneId, ...rest }) => {
      void id; void _p;
      return {
        ...rest,
        actIndex: actId != null ? actIndex.get(actId) ?? null : null,
        sceneIndex: sceneId != null ? sceneIndex.get(sceneId) ?? null : null,
      };
    }),
    notes: notes.map(({ id, projectId: _p, sceneId, ...rest }) => { void id; void _p; void sceneId; return rest; }),
  };
}

export async function importProjectJSON(backup: ProjectBackup): Promise<number> {
  if (backup.app !== "le-treteau") throw new Error("Ce fichier n'est pas un projet Le Tréteau.");
  const now = Date.now();
  return db.transaction(
    "rw",
    [db.projects, db.acts, db.scenes, db.characters, db.presence, db.beats, db.notes],
    async () => {
      const projectId = await db.projects.add({
        ...backup.project,
        createdAt: backup.project.createdAt ?? now,
        updatedAt: now,
      });

      const actIds: number[] = [];
      for (const a of backup.acts) actIds.push(await db.acts.add({ ...a, projectId }));

      const sceneIds: number[] = [];
      for (const s of backup.scenes) {
        const { actIndex, ...rest } = s;
        sceneIds.push(await db.scenes.add({ ...rest, projectId, actId: actIds[actIndex] ?? actIds[0], updatedAt: now }));
      }

      const charIds: number[] = [];
      for (const c of backup.characters) charIds.push(await db.characters.add({ ...c, projectId }));

      for (const p of backup.presence) {
        const { sceneIndex, characterIndex, ...rest } = p;
        const sceneId = sceneIds[sceneIndex];
        const characterId = charIds[characterIndex];
        if (sceneId != null && characterId != null) {
          await db.presence.add({ ...rest, projectId, sceneId, characterId });
        }
      }

      for (const b of backup.beats) {
        const { actIndex, sceneIndex, ...rest } = b;
        await db.beats.add({
          ...rest,
          projectId,
          actId: actIndex != null ? actIds[actIndex] : undefined,
          sceneId: sceneIndex != null ? sceneIds[sceneIndex] : undefined,
        });
      }

      for (const n of backup.notes) await db.notes.add({ ...n, projectId });

      return projectId;
    },
  );
}

// ── download helpers ─────────────────────────────────────────────────────────
export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugifyFilename(s: string): string {
  return (
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "piece"
  );
}
