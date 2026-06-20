import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, deleteProject } from "../db";
import { getTemplate } from "../structures";
import { useLang } from "../i18n";
import type { Project } from "../types";

export function ProjectSwitcher({
  active,
  onSwitch,
  onNew,
}: {
  active: Project;
  onSwitch: (id: number) => void;
  onNew: () => void;
}) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const projects = useLiveQuery(
    async () => (await db.projects.toArray()).sort((a, b) => b.updatedAt - a.updatedAt),
    [],
  ) as Project[] | undefined;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const untitled = t("Pièce sans titre", "Untitled Play");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 hover:border-gilt/50 px-3 py-1.5 max-w-[15rem] transition-colors"
      >
        <span className="text-gilt">❦</span>
        <span className="font-display font-semibold text-ink truncate text-sm">{active.title || untitled}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint shrink-0"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-line bg-surface-2 shadow-lift z-50 p-1.5 animate-riseIn">
          <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ink-faint font-sans">{t("Pièces", "Plays")}</div>
          <div className="max-h-72 overflow-y-auto">
            {projects?.map((p) => (
              <div
                key={p.id}
                className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-colors ${
                  p.id === active.id ? "bg-gilt/10" : "hover:bg-ink/5"
                }`}
                onClick={() => {
                  onSwitch(p.id!);
                  setOpen(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-ink truncate">{p.title || untitled}</div>
                  <div className="text-[11px] text-ink-faint truncate font-sans">
                    {getTemplate(p.structure).name[lang]} · {p.language.toUpperCase()}
                  </div>
                </div>
                {p.id === active.id && <span className="w-1.5 h-1.5 rounded-full bg-gilt shrink-0" />}
                {projects.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t("Supprimer cette pièce et tout son contenu ?", "Delete this play and all its content?"))) {
                        const remaining = projects.filter((x) => x.id !== p.id);
                        deleteProject(p.id!).then(() => {
                          if (p.id === active.id && remaining[0]) onSwitch(remaining[0].id!);
                        });
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-velvet-bright transition-opacity shrink-0"
                    title={t("Supprimer", "Delete")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="my-1.5 border-t border-line" />
          <button
            onClick={() => {
              onNew();
              setOpen(false);
            }}
            className="w-full text-left rounded-xl px-2.5 py-2 text-sm text-gilt hover:bg-gilt/10 transition-colors flex items-center gap-2 font-sans"
          >
            <span className="text-base leading-none">+</span> {t("Nouvelle pièce", "New play")}
          </button>
        </div>
      )}
    </div>
  );
}
