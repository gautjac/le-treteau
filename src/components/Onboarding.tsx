import { useState } from "react";
import { useLang } from "../i18n";
import { createProject } from "../db";
import { TEMPLATES } from "../structures";
import { PERSONAS } from "../personas";
import { LangToggle } from "./ui";
import type { Lang, StructureId } from "../types";

export function Onboarding({ onDone }: { onDone: (projectId: number) => void }) {
  const { lang, t } = useLang();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [author, setAuthor] = useState("");
  const [workLang, setWorkLang] = useState<Lang>(lang);
  const [structure, setStructure] = useState<StructureId>("three-act");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const id = await createProject({
        title: title.trim() || (workLang === "fr" ? "Pièce sans titre" : "Untitled Play"),
        logline: logline.trim(),
        author: author.trim(),
        language: workLang,
        structure,
      });
      onDone(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="curtain-fringe" />
      <div className="absolute top-3 right-4 z-10">
        <LangToggle />
      </div>

      <div className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-xl animate-riseIn">
          {/* Wordmark */}
          <div className="text-center mb-8">
            <p className="font-sans uppercase tracking-[0.35em] text-[11px] text-ink-faint mb-2">
              {t("L'Atelier présente", "The Atelier presents")}
            </p>
            <h1 className="font-display font-black text-5xl sm:text-6xl gilt-text leading-none">Le&nbsp;Tréteau</h1>
            <p className="font-body text-xl text-ink-dim mt-3 italic">
              {t(
                "Le studio de dramaturgie — pour bâtir une pièce, scène par scène.",
                "The dramaturgy studio — for building a play, scene by scene.",
              )}
            </p>
          </div>

          {step === 0 && (
            <div className="panel p-6 sm:p-7 space-y-5">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-ink">{t("La table de lecture", "The table-read")}</h2>
                <p className="text-ink-dim text-sm font-body text-base">
                  {t(
                    "Quatre voix de théâtre liront vos scènes et votre structure — en s'appuyant sur la grille de présence.",
                    "Four theatre voices will read your scenes and structure — leaning on the presence grid.",
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PERSONAS.map((p) => (
                  <div key={p.id} className="panel-3 p-3 flex gap-3 items-start">
                    <span className="text-2xl mt-0.5" style={{ color: p.hex }}>{p.glyph}</span>
                    <div>
                      <div className="font-sans font-semibold text-sm text-ink">{p.name[lang]}</div>
                      <div className="text-[11px] text-ink-faint uppercase tracking-wide">{p.role[lang]}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-1">
                <button className="btn-ghost px-4 py-2 text-sm" onClick={create} disabled={busy}>
                  {t("Passer — commencer vide", "Skip — start blank")}
                </button>
                <button className="btn-gilt px-5 py-2.5 text-sm" onClick={() => setStep(1)}>
                  {t("Créer ma pièce", "Create my play")} →
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="panel p-6 sm:p-7 space-y-5">
              <h2 className="font-display text-2xl text-ink">{t("Votre pièce", "Your play")}</h2>

              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-1">{t("Titre", "Title")}</span>
                <input
                  className="field w-full px-3 py-2.5 text-base font-display"
                  value={title}
                  autoFocus
                  placeholder={t("Le titre de la pièce", "The title of the play")}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-1">{t("Prémisse / logline", "Premise / logline")}</span>
                <textarea
                  className="field w-full px-3 py-2 text-sm font-sans resize-y"
                  rows={3}
                  value={logline}
                  placeholder={t("En une ou deux phrases : de quoi parle la pièce ?", "In a sentence or two: what is the play about?")}
                  onChange={(e) => setLogline(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-1">{t("Autrice / auteur", "Author")}</span>
                  <input
                    className="field w-full px-3 py-2 text-sm font-sans"
                    value={author}
                    placeholder={t("Votre nom", "Your name")}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-1">{t("Langue de travail", "Working language")}</span>
                  <div className="flex gap-2">
                    {(["fr", "en"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setWorkLang(l)}
                        className={`flex-1 px-3 py-2 rounded-xl border text-sm font-sans transition-colors ${
                          workLang === l ? "border-gilt bg-gilt/15 text-ink" : "border-line text-ink-dim hover:text-ink"
                        }`}
                      >
                        {l === "fr" ? "Français" : "English"}
                      </button>
                    ))}
                  </div>
                </label>
              </div>
              <p className="text-[11px] text-ink-faint -mt-2 font-body text-sm italic">
                {t(
                  "La langue de travail guide la table de lecture IA et le script exporté — indépendamment de la langue de l'interface.",
                  "The working language drives the AI table-read and the exported script — independent of the interface language.",
                )}
              </p>

              <div>
                <span className="block text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-2">{t("Structure", "Structure")}</span>
                <div className="grid gap-2">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setStructure(tpl.id)}
                      className={`text-left p-3 rounded-xl border transition-colors ${
                        structure === tpl.id ? "border-gilt bg-gilt/10" : "border-line hover:border-gilt/50"
                      }`}
                    >
                      <div className="font-sans font-semibold text-sm text-ink">{tpl.name[lang]}</div>
                      <div className="text-xs text-ink-dim font-body text-sm">{tpl.tagline[lang]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setStep(0)}>← {t("Retour", "Back")}</button>
                <button className="btn-gilt px-5 py-2.5 text-sm" onClick={create} disabled={busy}>
                  {busy ? t("On lève le rideau…", "Raising the curtain…") : t("Lever le rideau", "Raise the curtain")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="no-print text-center text-[11px] text-ink-faint py-4 font-sans">
        {t("local · privé · sans compte", "local · private · no account")}
      </footer>
    </div>
  );
}
