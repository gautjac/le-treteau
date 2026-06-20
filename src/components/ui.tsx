import type { ReactNode } from "react";
import type { CastColor } from "../types";
import { useLang } from "../i18n";

// ── Cast color → hex (matches tailwind cast.*) ───────────────────────────────
export const CAST_HEX: Record<CastColor, string> = {
  crimson: "#c0392b",
  amber: "#d68910",
  gold: "#caa83a",
  olive: "#7f8a30",
  jade: "#2e8b6f",
  teal: "#1f7a82",
  cobalt: "#3a5fae",
  indigo: "#5b4ba0",
  plum: "#8e3c79",
  rose: "#c45d7c",
  slate: "#5a6b78",
  rust: "#b0552d",
};

export function castHex(c: CastColor): string {
  return CAST_HEX[c] ?? CAST_HEX.gold;
}

// ── Language toggle (UI chrome) ──────────────────────────────────────────────
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-full border border-line bg-surface-2/70 p-0.5 text-xs font-sans">
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            lang === l ? "bg-gilt text-[#2a1607] font-semibold" : "text-ink-dim hover:text-ink"
          }`}
          aria-pressed={lang === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ── Theme toggle (light playbill / dark velvet) ──────────────────────────────
export function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  const { t } = useLang();
  return (
    <button
      onClick={onToggle}
      className="btn-ghost px-2.5 py-1.5 text-sm flex items-center gap-1.5"
      title={t("Basculer le thème", "Toggle theme")}
      aria-label={t("Basculer le thème", "Toggle theme")}
    >
      <span className="text-sm">{theme === "dark" ? "☾" : "☀"}</span>
    </button>
  );
}

// ── Field with label ─────────────────────────────────────────────────────────
export function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  rows = 2,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-1">{label}</span>
      {textarea ? (
        <textarea
          className={`field w-full px-3 py-2 text-sm resize-y ${mono ? "font-type" : "font-sans"}`}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field w-full px-3 py-2 text-sm font-sans"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function Glyph({ children }: { children: ReactNode }) {
  return <span className="inline-block text-gilt">{children}</span>;
}

export function Thinking({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-dim text-sm">
      <span className="flex gap-1 text-gilt">
        <span className="dot animate-pulseDot" style={{ animationDelay: "0ms" }} />
        <span className="dot animate-pulseDot" style={{ animationDelay: "150ms" }} />
        <span className="dot animate-pulseDot" style={{ animationDelay: "300ms" }} />
      </span>
      {label && <span className="font-body italic">{label}</span>}
    </div>
  );
}

export function Empty({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="text-4xl text-gilt/50 mb-3">{icon}</div>
      <p className="font-display text-xl text-ink">{title}</p>
      {hint && <p className="text-ink-dim text-sm mt-2 max-w-md mx-auto font-body text-base">{hint}</p>}
    </div>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-riseIn"
      onClick={onClose}
    >
      <div
        className={`panel w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[88vh] overflow-y-auto shadow-proscenium`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
