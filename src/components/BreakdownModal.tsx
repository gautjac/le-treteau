import { useState } from "react";
import { useLang } from "../i18n";
import { fetchBreakdown, type BreakdownResult } from "../api";
import { db, addAct, addScene, addCharacter, nextColor } from "../db";
import { CAST_COLORS } from "../db";
import { Modal, Thinking } from "./ui";
import { getTemplate } from "../structures";
import type { CastColor, Project } from "../types";

export function BreakdownModal({
  project,
  onClose,
  onOpenScene,
}: {
  project: Project;
  onClose: () => void;
  onOpenScene: (id: number) => void;
}) {
  const { t } = useLang();
  const [premise, setPremise] = useState(project.logline || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BreakdownResult | null>(null);
  const [applying, setApplying] = useState(false);

  async function run() {
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const r = await fetchBreakdown({
        project: { title: project.title, logline: project.logline, language: project.language, structure: getTemplate(project.structure).name[project.language] },
        premise: premise.trim(),
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!result) return;
    setApplying(true);
    try {
      let firstSceneId: number | undefined;
      // Characters
      const existing = await db.characters.where("projectId").equals(project.id!).toArray();
      const used: CastColor[] = existing.map((c) => c.color);
      for (const c of result.characters) {
        const color = nextColor(used);
        used.push(color);
        await addCharacter(project.id!, { name: c.name, cue: (c.cue || c.name).toUpperCase(), want: c.want, color });
      }
      // Acts + scenes
      let ci = 0;
      for (const act of result.acts) {
        const actId = await addAct(project.id!, act.title);
        for (const sc of act.scenes) {
          const color = CAST_COLORS[ci % CAST_COLORS.length];
          ci++;
          const id = await addScene(project.id!, actId, {
            title: sc.title,
            setting: sc.setting,
            synopsis: sc.synopsis,
            dramaticQuestion: sc.dramaticQuestion,
            objective: sc.objective,
            obstacle: sc.obstacle,
            tactic: sc.tactic,
            turningPoint: sc.turningPoint,
            stakes: sc.stakes,
            color,
          });
          if (firstSceneId === undefined) firstSceneId = id;
        }
      }
      onClose();
      if (firstSceneId !== undefined) onOpenScene(firstSceneId);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gilt text-xl">❦</span>
          <h2 className="font-display text-2xl text-ink">{t("Esquisser la structure", "Draft the structure")}</h2>
        </div>
        <p className="text-ink-dim text-sm font-body text-base mb-4">
          {t(
            "Le dramaturge propose un découpage actes → scènes avec l'analyse dramaturgique, plus une distribution. Appliqué d'un clic.",
            "The dramaturg proposes an act → scene breakdown with the dramaturgy filled in, plus a cast. Applied in one click.",
          )}
        </p>

        {!result && (
          <>
            <textarea
              className="field w-full px-3 py-2.5 text-sm font-sans resize-y"
              rows={4}
              value={premise}
              placeholder={t("Décrivez la pièce : la situation, les personnages, l'enjeu…", "Describe the play: the situation, the characters, the stakes…")}
              onChange={(e) => setPremise(e.target.value)}
              disabled={busy}
            />
            {error && <p className="text-velvet-bright text-sm mt-2 font-sans">{error}</p>}
            <div className="flex justify-between items-center mt-4">
              {busy ? <Thinking label={t("Le dramaturge réfléchit…", "The dramaturg is thinking…")} /> : <span />}
              <div className="flex gap-2">
                <button className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>{t("Annuler", "Cancel")}</button>
                <button className="btn-gilt px-5 py-2 text-sm" onClick={run} disabled={busy || premise.trim().length < 8}>
                  {t("Proposer", "Propose")}
                </button>
              </div>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-4">
            {result.characters.length > 0 && (
              <div className="panel-3 p-3">
                <div className="text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-2">{t("Distribution proposée", "Proposed cast")}</div>
                <div className="flex flex-wrap gap-2">
                  {result.characters.map((c, i) => (
                    <span key={i} className="text-xs panel px-2 py-1 font-sans" title={c.want}>
                      <b className="text-ink">{c.name}</b> <span className="text-ink-faint">· {c.cue}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
              {result.acts.map((act, ai) => (
                <div key={ai}>
                  <div className="font-display text-lg text-gilt">{act.title}</div>
                  <div className="grid gap-2 mt-1.5">
                    {act.scenes.map((s, si) => (
                      <div key={si} className="panel-3 p-3">
                        <div className="font-sans font-semibold text-sm text-ink">{s.title}{s.setting ? ` — ${s.setting}` : ""}</div>
                        <p className="text-xs text-ink-dim mt-0.5 font-body text-sm">{s.synopsis}</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px] font-sans">
                          <Field label={t("Objectif", "Objective")} v={s.objective} />
                          <Field label={t("Obstacle", "Obstacle")} v={s.obstacle} />
                          <Field label={t("Bascule", "Turning point")} v={s.turningPoint} />
                          <Field label={t("Enjeux", "Stakes")} v={s.stakes} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-1">
              <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setResult(null)} disabled={applying}>← {t("Refaire", "Redo")}</button>
              <button className="btn-gilt px-5 py-2 text-sm" onClick={apply} disabled={applying}>
                {applying ? t("Application…", "Applying…") : t("Appliquer à la pièce", "Apply to the play")}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, v }: { label: string; v: string }) {
  if (!v) return null;
  return (
    <div>
      <span className="text-ink-faint uppercase tracking-wide">{label}: </span>
      <span className="text-ink-dim">{v}</span>
    </div>
  );
}
