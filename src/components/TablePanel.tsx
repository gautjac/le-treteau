import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLang } from "../i18n";
import { PERSONAS, getPersona } from "../personas";
import { getTemplate } from "../structures";
import { fetchTable, type TableResult, type GridContext } from "../api";
import { db, addNote } from "../db";
import { Thinking } from "./ui";
import { ScriptPage } from "./ScriptPage";
import {
  buildPresenceGrid, longestAbsence, type PresenceEvent,
} from "../lib/frenchscenes";
import type { Act, Character, PersonaId, Presence, Project, Scene, TableMode } from "../types";

interface TableTarget {
  kind: "scene" | "structure";
  sceneId?: number;
  text: string;
  label: string;
}

export function TablePanel({
  project,
  target,
  selection,
  onInsert,
}: {
  project: Project;
  target: TableTarget | null;
  selection: string;
  onInsert: (script: string) => void;
}) {
  const { lang, t } = useLang();
  const [persona, setPersona] = useState<PersonaId>("dramaturge");
  const [mode, setMode] = useState<TableMode>("notes");
  const [sketchPremise, setSketchPremise] = useState("");
  const [sketchCount, setSketchCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);

  // Presence grid context for the active scene (fed to the metteur en scène / dramaturge).
  const characters = useLiveQuery(
    async () => (await db.characters.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order),
    [project.id],
  ) as Character[] | undefined;

  async function buildGridContext(): Promise<GridContext | undefined> {
    if (!characters || characters.length === 0) return undefined;
    const charIds = characters.map((c) => c.id!);
    const acts = (await db.acts.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order) as Act[];
    const scenes = (await db.scenes.where("projectId").equals(project.id!).toArray()) as Scene[];
    const presence = (await db.presence.where("projectId").equals(project.id!).toArray()) as Presence[];
    const byScene = new Map<number, PresenceEvent[]>();
    for (const p of presence) {
      const arr = byScene.get(p.sceneId) ?? [];
      arr.push({ characterId: p.characterId, kind: p.kind, at: p.at });
      byScene.set(p.sceneId, arr);
    }
    // Flat per-character column presence across the whole play.
    const rows = new Map<number, boolean[]>();
    charIds.forEach((id) => rows.set(id, []));
    let total = 0;
    for (const act of acts) {
      const actScenes = scenes.filter((s) => s.actId === act.id).sort((a, b) => a.order - b.order);
      for (const sc of actScenes) {
        const grid = buildPresenceGrid(charIds, byScene.get(sc.id!) ?? []);
        grid.scenes.forEach((fs) => {
          total++;
          charIds.forEach((id) => rows.get(id)!.push(fs.onStage.includes(id)));
        });
      }
    }
    if (total === 0) return undefined;
    const lines = characters.map((c) => {
      const row = rows.get(c.id!)!;
      const present = row.filter(Boolean).length;
      const gap = longestAbsence(row);
      return `${(c.cue || c.name || "?").toUpperCase()}: présent dans ${present}/${total} scènes françaises; plus longue absence ${gap}.`;
    });
    return { summary: lines.join("\n") };
  }

  async function run() {
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const ctx = {
        title: project.title,
        logline: project.logline,
        language: project.language,
        structure: getTemplate(project.structure).name[project.language],
      };
      let grid: GridContext | undefined;
      if (mode === "notes") grid = await buildGridContext();

      const r = await fetchTable({
        project: ctx,
        persona,
        mode,
        target: target?.text,
        scope: target?.kind ?? "scene",
        selection: selection || undefined,
        premise: mode === "sketch" ? sketchPremise || project.logline : undefined,
        count: sketchCount,
        grid,
      });
      setResult(r);
      // Persist as a note for the record.
      if (target?.sceneId) {
        await addNote({
          projectId: project.id!,
          sceneId: target.sceneId,
          persona,
          mode,
          body: JSON.stringify(r),
          target: target.label,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const meta = getPersona(persona);
  const canRun = mode === "sketch" ? (sketchPremise.trim() || project.logline).length >= 8 : !!target;

  const MODES: { id: TableMode; label: string; hint: string }[] = [
    { id: "notes", label: t("Notes", "Notes"), hint: t("Critique de la scène ou de la structure", "Critique the scene or structure") },
    { id: "punch-up", label: t("Aiguiser", "Punch-up"), hint: t("Réécrire un passage", "Sharpen a passage") },
    { id: "sketch", label: t("Esquisser", "Sketch"), hint: t("Idées de scènes depuis une prémisse", "Scene ideas from a premise") },
  ];

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gilt text-lg">☷</span>
        <h3 className="font-display text-xl text-ink">{t("La table", "The Table")}</h3>
      </div>

      {/* Persona picker */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-center transition-colors ${
              persona === p.id ? "border-current" : "border-line hover:border-gilt/40"
            }`}
            style={{ color: persona === p.id ? p.hex : undefined, background: persona === p.id ? p.hex + "14" : undefined }}
            title={p.role[lang]}
          >
            <span className="text-lg" style={{ color: p.hex }}>{p.glyph}</span>
            <span className="text-[10px] font-sans leading-tight text-ink">{p.name[lang].replace(/^(Le |La |L')/, "")}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-dim font-body text-sm italic mb-3 min-h-[2.5em]">{meta.intro[lang]}</p>

      {/* Mode */}
      <div className="flex gap-1 bg-surface-3/60 border border-line rounded-xl p-1 mb-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(null); }}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors ${
              mode === m.id ? "bg-gilt/15 text-gilt" : "text-ink-dim hover:text-ink"
            }`}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "sketch" && (
        <div className="space-y-2 mb-3">
          <textarea
            className="field w-full px-2.5 py-2 text-sm font-sans resize-y"
            rows={3}
            value={sketchPremise}
            placeholder={project.logline || t("Une prémisse à explorer…", "A premise to explore…")}
            onChange={(e) => setSketchPremise(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-ink-dim font-sans">
            {t("Nombre d'idées", "Number of ideas")}
            <input type="range" min={2} max={8} value={sketchCount} onChange={(e) => setSketchCount(Number(e.target.value))} className="flex-1" />
            <span className="tnum text-ink">{sketchCount}</span>
          </label>
        </div>
      )}

      {mode !== "sketch" && (
        <div className="text-xs text-ink-faint font-sans mb-3">
          {target
            ? <>{t("Cible", "Target")}: <span className="text-ink">{target.label}</span>{target.kind === "structure" && ` · ${t("structure entière", "whole structure")}`}{mode === "punch-up" && selection && ` · ${t("sélection", "selection")} (${selection.length})`}</>
            : <span className="italic">{t("Ouvrez une scène pour donner une cible.", "Open a scene to give a target.")}</span>}
        </div>
      )}

      <button className="btn-velvet w-full py-2.5 text-sm" onClick={run} disabled={busy || !canRun}>
        {busy ? t("À la table…", "At the table…") : (
          mode === "notes" ? t("Demander des notes", "Ask for notes")
          : mode === "punch-up" ? t("Aiguiser le passage", "Punch up the passage")
          : t("Esquisser des scènes", "Sketch scenes")
        )}
      </button>

      {busy && <div className="mt-3"><Thinking label={`${meta.name[lang]} ${t("lit…", "is reading…")}`} /></div>}
      {error && <p className="text-velvet-bright text-sm mt-3 font-sans">{error}</p>}

      {result && (
        <div className="mt-4 animate-riseIn">
          {result.opener && (
            <p className="font-body text-base italic text-ink-dim mb-3 pl-3 border-l-2" style={{ borderColor: meta.hex }}>
              {result.opener}
            </p>
          )}

          {result.notes && (
            <div className="space-y-2">
              {result.notes.map((n, i) => (
                <div key={i} className="panel-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-sans font-semibold text-sm text-ink">{n.heading}</div>
                    <Weight w={n.weight} />
                  </div>
                  <p className="text-sm text-ink-dim mt-1 font-body text-base">{n.body}</p>
                </div>
              ))}
            </div>
          )}

          {result.rewrites && (
            <div className="space-y-3">
              {result.rewrites.map((r, i) => (
                <div key={i} className="panel-3 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-sans font-semibold uppercase tracking-wide" style={{ color: meta.hex }}>{r.angle}</span>
                    <button className="text-xs text-gilt hover:underline font-sans" onClick={() => onInsert(r.script)}>
                      {t("Insérer dans le texte", "Insert into script")} ↵
                    </button>
                  </div>
                  <ScriptPage script={r.script} compact />
                </div>
              ))}
            </div>
          )}

          {result.sketches && (
            <div className="space-y-2">
              {result.sketches.map((s, i) => (
                <div key={i} className="panel-3 p-3">
                  <div className="font-sans font-semibold text-sm text-ink">{s.title}</div>
                  <p className="text-sm text-ink-dim mt-1 font-body text-base">{s.premise}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Weight({ w }: { w: "légère" | "moyenne" | "forte" }) {
  const map = { légère: { c: "#7f8a30", n: 1 }, moyenne: { c: "#d68910", n: 2 }, forte: { c: "#c0392b", n: 3 } };
  const m = map[w];
  return (
    <span className="flex gap-0.5 shrink-0 mt-1" title={w}>
      {[1, 2, 3].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i <= m.n ? m.c : "rgb(var(--line))" }} />
      ))}
    </span>
  );
}
