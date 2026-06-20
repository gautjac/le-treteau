import type { Lang, PersonaId } from "./types";

export interface PersonaMeta {
  id: PersonaId;
  glyph: string;
  name: { fr: string; en: string };
  role: { fr: string; en: string };
  intro: { fr: string; en: string };
  hex: string;
}

export const PERSONAS: PersonaMeta[] = [
  {
    id: "dramaturge",
    glyph: "❦",
    name: { fr: "Le Dramaturge", en: "The Dramaturg" },
    role: { fr: "Structure & action", en: "Structure & action" },
    intro: {
      fr: "Je lis la charpente. L'objectif de chaque scène, son obstacle, son point de bascule — et ce que la pièce entière en attend.",
      en: "I read the architecture. Each scene's objective, its obstacle, its turning point — and what the whole play asks of it.",
    },
    hex: "#c79a3e",
  },
  {
    id: "metteur",
    glyph: "▲",
    name: { fr: "Le Metteur en scène", en: "The Director" },
    role: { fr: "Plateau & présence", en: "Staging & presence" },
    intro: {
      fr: "Je vois le plateau. Les entrées et sorties, qui occupe l'espace, le tableau vivant — et les vides de la grille de présence.",
      en: "I see the stage. Entrances and exits, who holds the space, the living picture — and the gaps in the presence grid.",
    },
    hex: "#2e8b6f",
  },
  {
    id: "acteur",
    glyph: "❛",
    name: { fr: "L'Acteur", en: "The Actor" },
    role: { fr: "Jouabilité & sous-texte", en: "Playability & subtext" },
    intro: {
      fr: "Je dis le texte tout haut. La voix, le souffle, le sous-texte, la réplique qu'on peut couver ou couper.",
      en: "I say the lines aloud. Voice, breath, subtext, the line worth holding or cutting.",
    },
    hex: "#c0392b",
  },
  {
    id: "sceptique",
    glyph: "?",
    name: { fr: "Le Sceptique", en: "The Skeptic" },
    role: { fr: "Ce qui cloche", en: "What's not working" },
    intro: {
      fr: "Je cesse de croire, exprès, et je dis où. Les enjeux affirmés mais pas ressentis, les facilités, le moment où la pièce triche.",
      en: "I stop believing, on purpose, and I say where. Stakes asserted but unfelt, conveniences, the moment the play cheats.",
    },
    hex: "#5b4ba0",
  },
];

export function getPersona(id: PersonaId): PersonaMeta {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

export const T = (lang: Lang) => <K extends { fr: string; en: string }>(o: K) => o[lang];
