import { useLiveQuery } from "dexie-react-hooks";
import { db, addCharacter, updateCharacter, deleteCharacter, CAST_COLORS } from "../db";
import { useLang } from "../i18n";
import { castHex, Empty } from "./ui";
import type { Character, Project } from "../types";

export function CastView({ project }: { project: Project }) {
  const { t } = useLang();
  const characters = useLiveQuery(
    async () => (await db.characters.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order),
    [project.id],
  ) as Character[] | undefined;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-ink">{t("La distribution", "The Cast")}</h2>
          <p className="text-ink-dim text-sm font-body text-base">
            {t(
              "Les personnages nourrissent la grille de présence et la table de lecture.",
              "The characters feed the presence grid and the table-read.",
            )}
          </p>
        </div>
        <button
          className="btn-gilt px-4 py-2 text-sm flex items-center gap-2"
          onClick={() => addCharacter(project.id!, { name: t("Nouveau personnage", "New character") })}
        >
          <span className="text-base leading-none">+</span> {t("Personnage", "Character")}
        </button>
      </div>

      {characters && characters.length === 0 && (
        <Empty
          icon="☻"
          title={t("Pas encore de distribution", "No cast yet")}
          hint={t("Ajoutez vos personnages — ils apparaîtront en lignes dans la grille de présence.", "Add your characters — they'll become the rows of the presence grid.")}
        />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {characters?.map((c) => (
          <CharacterCard key={c.id} character={c} />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({ character: c }: { character: Character }) {
  const { t } = useLang();
  const hex = castHex(c.color);

  return (
    <div className="panel p-4 relative" style={{ borderLeft: `4px solid ${hex}` }}>
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full grid place-items-center font-display font-bold text-white shrink-0 shadow"
          style={{ background: hex }}
        >
          {(c.name || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            className="field w-full px-2.5 py-1.5 text-base font-display"
            value={c.name}
            placeholder={t("Nom", "Name")}
            onChange={(e) => updateCharacter(c.id!, { name: e.target.value })}
          />
          <input
            className="field w-full px-2.5 py-1.5 text-xs font-type uppercase tracking-wide"
            value={c.cue}
            placeholder={t("RÉPLIQUE (nom en majuscules)", "CUE (caps name)")}
            onChange={(e) => updateCharacter(c.id!, { cue: e.target.value.toUpperCase() })}
          />
        </div>
        <button
          className="text-ink-faint hover:text-velvet-bright transition-colors shrink-0"
          title={t("Supprimer", "Delete")}
          onClick={() => {
            if (confirm(t("Supprimer ce personnage et ses présences ?", "Delete this character and its presences?"))) deleteCharacter(c.id!);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 mt-3">
        <Mini label={t("Veut (objectif)", "Wants (objective)")} value={c.want} onChange={(v) => updateCharacter(c.id!, { want: v })} />
        <Mini label={t("Biographie", "Bio")} value={c.bio} onChange={(v) => updateCharacter(c.id!, { bio: v })} textarea />
        <Mini label={t("Relations", "Relationships")} value={c.relationships} onChange={(v) => updateCharacter(c.id!, { relationships: v })} textarea />
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        {CAST_COLORS.map((col) => (
          <button
            key={col}
            onClick={() => updateCharacter(c.id!, { color: col })}
            className={`w-4 h-4 rounded-full transition-transform ${c.color === col ? "ring-2 ring-offset-1 ring-offset-surface-2 scale-110" : "hover:scale-110"}`}
            style={{ background: castHex(col), boxShadow: c.color === col ? `0 0 0 2px ${castHex(col)}` : undefined }}
            title={col}
          />
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-faint font-sans mb-0.5">{label}</span>
      {textarea ? (
        <textarea className="field w-full px-2.5 py-1.5 text-sm font-sans resize-y" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="field w-full px-2.5 py-1.5 text-sm font-sans" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
