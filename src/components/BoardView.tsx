import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db, addAct, updateAct, deleteAct, addScene, addBeat, updateBeat,
  deleteBeat, reorderBeats, beatToScene,
} from "../db";
import { useLang } from "../i18n";
import { castHex, Empty } from "./ui";
import { BreakdownModal } from "./BreakdownModal";
import type { Act, Beat, Project, Scene } from "../types";

export function BoardView({
  project,
  onOpenScene,
}: {
  project: Project;
  onOpenScene: (sceneId: number) => void;
}) {
  const { t } = useLang();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overAct, setOverAct] = useState<number | null>(null);

  const acts = useLiveQuery(
    async () => (await db.acts.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order),
    [project.id],
  ) as Act[] | undefined;
  const scenes = useLiveQuery(
    async () => await db.scenes.where("projectId").equals(project.id!).toArray(),
    [project.id],
  ) as Scene[] | undefined;
  const beats = useLiveQuery(
    async () => (await db.beats.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order),
    [project.id],
  ) as Beat[] | undefined;

  if (!acts || !scenes || !beats) return null;

  async function dropOnAct(actId: number) {
    if (dragId == null) return;
    const ordered = beats!
      .map((b) => ({ id: b.id!, actId: b.id === dragId ? actId : b.actId }))
      .sort((a, b) => a.id - b.id);
    await reorderBeats(ordered);
    setDragId(null);
    setOverAct(null);
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink leading-tight">{project.title || t("Pièce sans titre", "Untitled Play")}</h1>
          {project.logline && <p className="text-ink-dim mt-1 max-w-2xl text-sm font-body text-base">{project.logline}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn-velvet px-4 py-2 text-sm flex items-center gap-2" onClick={() => setShowBreakdown(true)}>
            <span>❦</span> {t("Esquisser la structure", "Draft the structure")}
          </button>
          <button className="btn-ghost px-4 py-2 text-sm" onClick={() => addAct(project.id!, t(`Acte ${acts.length + 1}`, `Act ${acts.length + 1}`))}>
            + {t("Acte", "Act")}
          </button>
        </div>
      </div>

      {acts.length === 0 && (
        <Empty icon="▤" title={t("Aucun acte", "No acts")} hint={t("Ajoutez un acte, ou esquissez la structure à partir d'une prémisse.", "Add an act, or draft the structure from a premise.")} />
      )}

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3 items-start">
        {acts.map((act) => {
          const actScenes = scenes.filter((s) => s.actId === act.id).sort((a, b) => a.order - b.order);
          const actBeats = beats.filter((b) => b.actId === act.id);
          return (
            <div
              key={act.id}
              className={`panel p-3.5 ${overAct === act.id ? "card-over" : ""}`}
              onDragOver={(e) => {
                if (dragId != null) {
                  e.preventDefault();
                  setOverAct(act.id!);
                }
              }}
              onDragLeave={() => setOverAct((a) => (a === act.id ? null : a))}
              onDrop={() => dropOnAct(act.id!)}
            >
              <div className="flex items-center gap-2 mb-3">
                <input
                  className="flex-1 bg-transparent font-display text-lg text-ink outline-none border-b border-transparent focus:border-gilt/50 py-0.5"
                  value={act.title}
                  onChange={(e) => updateAct(act.id!, { title: e.target.value })}
                />
                <button
                  className="text-ink-faint hover:text-velvet-bright transition-colors"
                  title={t("Supprimer l'acte", "Delete act")}
                  onClick={() => {
                    if (confirm(t("Supprimer cet acte et ses scènes ?", "Delete this act and its scenes?"))) deleteAct(act.id!);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>

              {/* Real scenes */}
              <div className="space-y-2">
                {actScenes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onOpenScene(s.id!)}
                    className="beat-card w-full text-left p-3 rounded-xl"
                    style={{ background: castHex(s.color) + "22", borderLeft: `3px solid ${castHex(s.color)}` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans font-semibold text-sm text-ink truncate">{s.title || t("Scène", "Scene")}</span>
                      <span className="text-[10px] uppercase tracking-wide text-ink-faint shrink-0">{t("scène", "scene")}</span>
                    </div>
                    {(s.setting || s.synopsis) && (
                      <p className="text-xs text-ink-dim mt-1 line-clamp-2 font-body text-sm">{s.setting ? `${s.setting} — ` : ""}{s.synopsis}</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Planning beats (draggable index cards) */}
              {actBeats.length > 0 && (
                <div className="mt-2.5 space-y-2">
                  {actBeats.map((b) => (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={() => setDragId(b.id!)}
                      onDragEnd={() => { setDragId(null); setOverAct(null); }}
                      className={`beat-card p-2.5 rounded-xl cursor-grab active:cursor-grabbing border border-dashed ${dragId === b.id ? "card-dragging" : ""}`}
                      style={{ background: castHex(b.color) + "14", borderColor: castHex(b.color) + "66" }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-ink-faint text-xs mt-1">⠿</span>
                        <div className="flex-1 min-w-0">
                          <input
                            className="w-full bg-transparent font-sans font-medium text-sm text-ink outline-none"
                            value={b.title}
                            placeholder={t("Idée de scène…", "Scene idea…")}
                            onChange={(e) => updateBeat(b.id!, { title: e.target.value })}
                          />
                          {b.summary && <p className="text-[11px] text-ink-dim mt-0.5 line-clamp-2 font-body text-xs">{b.summary}</p>}
                          <div className="flex gap-2 mt-1.5">
                            <button
                              className="text-[11px] text-gilt hover:underline font-sans"
                              onClick={() => beatToScene(b.id!, act.id!).then(onOpenScene)}
                            >
                              {t("→ Devenir une scène", "→ Make a scene")}
                            </button>
                            <button
                              className="text-[11px] text-ink-faint hover:text-velvet-bright font-sans"
                              onClick={() => deleteBeat(b.id!)}
                            >
                              {t("retirer", "remove")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  className="btn-ghost flex-1 px-2 py-1.5 text-xs"
                  onClick={() => addScene(project.id!, act.id!, { title: t(`Scène ${actScenes.length + 1}`, `Scene ${actScenes.length + 1}`) }).then(onOpenScene)}
                >
                  + {t("Scène", "Scene")}
                </button>
                <button
                  className="btn-ghost flex-1 px-2 py-1.5 text-xs"
                  onClick={() => addBeat(project.id!, act.id!, { title: "" })}
                >
                  + {t("Carte", "Card")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showBreakdown && <BreakdownModal project={project} onClose={() => setShowBreakdown(false)} onOpenScene={onOpenScene} />}
    </div>
  );
}
