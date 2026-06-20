import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useLang } from "../i18n";
import {
  toScript, exportProjectJSON, importProjectJSON, downloadText, slugifyFilename,
  type FullProject,
} from "../lib/exporter";
import type { Act, Character, Project, Scene } from "../types";

export function ExportView({ project, onImported }: { project: Project; onImported: (id: number) => void }) {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const acts = useLiveQuery(async () => await db.acts.where("projectId").equals(project.id!).toArray(), [project.id]) as Act[] | undefined;
  const scenes = useLiveQuery(async () => await db.scenes.where("projectId").equals(project.id!).toArray(), [project.id]) as Scene[] | undefined;
  const characters = useLiveQuery(async () => await db.characters.where("projectId").equals(project.id!).toArray(), [project.id]) as Character[] | undefined;

  const full: FullProject | null = acts && scenes && characters ? { project, acts, scenes, characters } : null;
  const base = slugifyFilename(project.title);

  async function doImport(file: File) {
    setImportMsg(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const id = await importProjectJSON(backup);
      setImportMsg(t("Importé ✓", "Imported ✓"));
      onImported(id);
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-display text-2xl sm:text-3xl text-ink mb-1">{t("Exporter", "Export")}</h2>
      <p className="text-ink-dim text-sm font-body text-base mb-5">
        {t("Sortez le script en PDF, en texte/markdown, ou sauvegardez tout en JSON.", "Print the script to PDF, export text/markdown, or back everything up as JSON.")}
      </p>

      <div className="space-y-3">
        <Row
          title={t("Script — PDF imprimable", "Script — print-ready PDF")}
          desc={t("Mise en page théâtrale propre, via l'impression du navigateur.", "Clean stage-play layout, via the browser's print dialog.")}
          action={t("Imprimer / PDF", "Print / PDF")}
          onClick={() => window.print()}
          primary
        />
        <Row
          title={t("Script — texte brut", "Script — plain text")}
          desc=".txt"
          action={t("Télécharger", "Download")}
          disabled={!full}
          onClick={() => full && downloadText(`${base}.txt`, toScript(full), "text/plain")}
        />
        <Row
          title={t("Script — Markdown", "Script — Markdown")}
          desc=".md"
          action={t("Télécharger", "Download")}
          disabled={!full}
          onClick={() => full && downloadText(`${base}.md`, toScript(full, { markdown: true }), "text/markdown")}
        />
        <div className="border-t border-line my-3" />
        <Row
          title={t("Sauvegarde complète", "Full backup")}
          desc={t("Tout le projet (actes, scènes, dramaturgie, distribution, présences) — réimportable.", "The whole project (acts, scenes, dramaturgy, cast, presences) — re-importable.")}
          action={t("Exporter JSON", "Export JSON")}
          onClick={async () => {
            const backup = await exportProjectJSON(project.id!);
            downloadText(`${base}.treteau.json`, JSON.stringify(backup, null, 2), "application/json");
          }}
        />
        <Row
          title={t("Importer une sauvegarde", "Import a backup")}
          desc={t("Crée une nouvelle pièce à partir d'un fichier .treteau.json.", "Creates a new play from a .treteau.json file.")}
          action={t("Choisir un fichier", "Choose a file")}
          onClick={() => fileRef.current?.click()}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        {importMsg && <p className="text-sm text-gilt font-sans">{importMsg}</p>}
      </div>
    </div>
  );
}

function Row({
  title, desc, action, onClick, disabled, primary,
}: {
  title: string; desc: string; action: string; onClick: () => void; disabled?: boolean; primary?: boolean;
}) {
  return (
    <div className="panel p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-sans font-semibold text-sm text-ink">{title}</div>
        <div className="text-xs text-ink-dim font-body text-sm">{desc}</div>
      </div>
      <button className={`${primary ? "btn-gilt" : "btn-ghost"} px-4 py-2 text-sm shrink-0`} onClick={onClick} disabled={disabled}>
        {action}
      </button>
    </div>
  );
}
