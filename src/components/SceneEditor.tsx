import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, updateScene, deleteScene, CAST_COLORS } from "../db";
import { useLang } from "../i18n";
import { castHex, Field, Empty } from "./ui";
import { PresenceEditor } from "./PresenceEditor";
import { ScriptPage } from "./ScriptPage";
import { cuesInScript } from "../lib/stageplay";
import type { Character, Project, Scene } from "../types";

type Tab = "dramaturgy" | "presence" | "script";

export function SceneEditor({
  project,
  sceneId,
  onSelectionChange,
  registerInsert,
}: {
  project: Project;
  sceneId: number | null;
  onSelectionChange: (s: string) => void;
  registerInsert: (fn: (script: string) => void) => void;
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("dramaturgy");
  const [preview, setPreview] = useState(true);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const scene = useLiveQuery(
    async () => (sceneId ? ((await db.scenes.get(sceneId)) ?? null) : null),
    [sceneId],
  ) as Scene | null | undefined;
  const characters = useLiveQuery(
    async () => (await db.characters.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order),
    [project.id],
  ) as Character[] | undefined;

  // Register the "insert AI rewrite into script" callback.
  useEffect(() => {
    registerInsert((snippet: string) => {
      if (!scene) return;
      const cur = scene.script ?? "";
      const joiner = cur.trim() ? "\n\n" : "";
      updateScene(scene.id!, { script: cur + joiner + snippet.trim() + "\n" });
      setTab("script");
    });
  }, [scene, registerInsert]);

  function captureSelection() {
    const ta = taRef.current;
    if (!ta) return;
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    onSelectionChange(sel.trim());
  }

  if (sceneId === null) {
    return (
      <div className="panel">
        <Empty
          icon="❡"
          title={t("Choisissez une scène", "Pick a scene")}
          hint={t("Ouvrez une scène depuis le plateau pour travailler sa dramaturgie, sa présence et son texte.", "Open a scene from the board to work its dramaturgy, presence, and text.")}
        />
      </div>
    );
  }
  if (scene === undefined || characters === undefined) return null;
  if (scene === null) {
    return <div className="panel"><Empty icon="∅" title={t("Scène introuvable", "Scene not found")} /></div>;
  }

  // Cues used in the script that aren't in the cast (a gentle warning).
  const knownCues = new Set(characters.map((c) => (c.cue || c.name).toUpperCase()).filter(Boolean));
  const orphanCues = cuesInScript(scene.script).filter((q) => !knownCues.has(q));

  const TABS: { id: Tab; label: string; glyph: string }[] = [
    { id: "dramaturgy", label: t("Dramaturgie", "Dramaturgy"), glyph: "✶" },
    { id: "presence", label: t("Présence", "Presence"), glyph: "▦" },
    { id: "script", label: t("Texte", "Script"), glyph: "❡" },
  ];

  return (
    <div className="panel p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="w-3 h-3 rounded-full mt-2 shrink-0" style={{ background: castHex(scene.color) }} />
        <div className="flex-1 min-w-0">
          <input
            className="w-full bg-transparent font-display text-2xl text-ink outline-none border-b border-transparent focus:border-gilt/40 pb-0.5"
            value={scene.title}
            placeholder={t("Titre de la scène", "Scene title")}
            onChange={(e) => updateScene(scene.id!, { title: e.target.value })}
          />
          <input
            className="w-full bg-transparent text-sm text-ink-dim outline-none mt-1 font-body text-base"
            value={scene.setting}
            placeholder={t("Lieu / décor", "Place / setting")}
            onChange={(e) => updateScene(scene.id!, { setting: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {CAST_COLORS.slice(0, 6).map((col) => (
            <button
              key={col}
              onClick={() => updateScene(scene.id!, { color: col })}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${scene.color === col ? "scale-125" : "hover:scale-110 opacity-60"}`}
              style={{ background: castHex(col) }}
            />
          ))}
          <button
            className="text-ink-faint hover:text-velvet-bright ml-1"
            title={t("Supprimer la scène", "Delete scene")}
            onClick={() => {
              if (confirm(t("Supprimer cette scène ?", "Delete this scene?"))) deleteScene(scene.id!);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-3/60 border border-line rounded-xl p-1 mb-4 w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors flex items-center gap-1.5 ${
              tab === tb.id ? "bg-gilt/15 text-gilt" : "text-ink-dim hover:text-ink"
            }`}
          >
            <span className="text-xs">{tb.glyph}</span> {tb.label}
          </button>
        ))}
      </div>

      {tab === "dramaturgy" && (
        <div className="space-y-3 animate-riseIn">
          <Field label={t("Synopsis", "Synopsis")} value={scene.synopsis} onChange={(v) => updateScene(scene.id!, { synopsis: v })} textarea rows={2} placeholder={t("Que se passe-t-il ?", "What happens?")} />
          <Field label={t("Question dramatique", "Dramatic question")} value={scene.dramaticQuestion} onChange={(v) => updateScene(scene.id!, { dramaticQuestion: v })} placeholder={t("Va-t-elle… ?", "Will she… ?")} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("Objectif", "Objective")} value={scene.objective} onChange={(v) => updateScene(scene.id!, { objective: v })} textarea rows={2} />
            <Field label={t("Obstacle", "Obstacle")} value={scene.obstacle} onChange={(v) => updateScene(scene.id!, { obstacle: v })} textarea rows={2} />
            <Field label={t("Tactique", "Tactic")} value={scene.tactic} onChange={(v) => updateScene(scene.id!, { tactic: v })} textarea rows={2} />
            <Field label={t("Point de bascule", "Turning point")} value={scene.turningPoint} onChange={(v) => updateScene(scene.id!, { turningPoint: v })} textarea rows={2} />
          </div>
          <Field label={t("Enjeux", "Stakes")} value={scene.stakes} onChange={(v) => updateScene(scene.id!, { stakes: v })} textarea rows={2} />
        </div>
      )}

      {tab === "presence" && (
        <div className="animate-riseIn">
          <PresenceEditor scene={scene} characters={characters} />
        </div>
      )}

      {tab === "script" && (
        <div className="animate-riseIn">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-ink-faint font-sans">
              {t("Réplique : NOM EN MAJUSCULES · didascalie : (entre parenthèses) · *italique* · **gras**", "Cue: NAME IN CAPS · stage direction: (in parentheses) · *italic* · **bold**")}
            </div>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setPreview((p) => !p)}>
              {preview ? t("Cacher l'aperçu", "Hide preview") : t("Aperçu typographié", "Typeset preview")}
            </button>
          </div>
          {orphanCues.length > 0 && (
            <p className="text-[11px] text-cast-amber mb-2 font-sans">
              {t("Répliques absentes de la distribution :", "Cues not in the cast:")} {orphanCues.join(", ")}
            </p>
          )}
          <div className={`grid gap-3 ${preview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
            <textarea
              ref={taRef}
              className="field w-full px-3 py-3 text-sm font-type leading-relaxed resize-y min-h-[420px]"
              value={scene.script}
              placeholder={t("HÉLÈNE\nJe pars ce soir.\n\n(Elle se lève.)", "HÉLÈNE\nI leave tonight.\n\n(She rises.)")}
              onChange={(e) => updateScene(scene.id!, { script: e.target.value })}
              onSelect={captureSelection}
              onKeyUp={captureSelection}
              onMouseUp={captureSelection}
              spellCheck
            />
            {preview && (
              <div className="overflow-y-auto max-h-[560px]">
                <ScriptPage script={scene.script} compact />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
