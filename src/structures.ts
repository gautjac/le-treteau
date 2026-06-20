import type { CastColor, Lang, StructureId } from "./types";

export interface StructureTemplate {
  id: StructureId;
  name: { fr: string; en: string };
  tagline: { fr: string; en: string };
  /** Act titles, in order — these seed the act hierarchy. */
  acts: { fr: string; en: string }[];
  /** Optional seed beats per act (index 0-based into `acts`). */
  beats: { actIndex: number; title: { fr: string; en: string }; summary: { fr: string; en: string }; color: CastColor }[];
}

const C = {
  open: "gold" as CastColor,
  rise: "amber" as CastColor,
  turn: "rust" as CastColor,
  crisis: "crimson" as CastColor,
  fall: "plum" as CastColor,
  close: "jade" as CastColor,
};

export const TEMPLATES: StructureTemplate[] = [
  {
    id: "three-act",
    name: { fr: "Trois actes", en: "Three Acts" },
    tagline: {
      fr: "Exposition, confrontation, dénouement — la charpente classique.",
      en: "Exposition, confrontation, resolution — the classic spine.",
    },
    acts: [
      { fr: "Acte I — Exposition", en: "Act I — Exposition" },
      { fr: "Acte II — Confrontation", en: "Act II — Confrontation" },
      { fr: "Acte III — Dénouement", en: "Act III — Resolution" },
    ],
    beats: [
      { actIndex: 0, color: C.open, title: { fr: "Ouverture", en: "Opening" }, summary: { fr: "Le monde, les personnages, l'équilibre avant la rupture.", en: "The world, the characters, the balance before the break." } },
      { actIndex: 0, color: C.turn, title: { fr: "Élément déclencheur", en: "Inciting Incident" }, summary: { fr: "L'événement qui rompt l'équilibre et lance l'action.", en: "The event that breaks the balance and launches the action." } },
      { actIndex: 1, color: C.rise, title: { fr: "Montée", en: "Rising Action" }, summary: { fr: "Obstacles, tactiques, enjeux qui montent.", en: "Obstacles, tactics, rising stakes." } },
      { actIndex: 1, color: C.crisis, title: { fr: "Crise", en: "Crisis" }, summary: { fr: "Le point de bascule, le sommet de la tension.", en: "The turning point, the peak of tension." } },
      { actIndex: 2, color: C.close, title: { fr: "Dénouement", en: "Resolution" }, summary: { fr: "La question dramatique trouve réponse ; nouvel équilibre.", en: "The dramatic question is answered; a new balance." } },
    ],
  },
  {
    id: "five-act",
    name: { fr: "Cinq actes (Freytag)", en: "Five Acts (Freytag)" },
    tagline: {
      fr: "La pyramide de Freytag — exposition, montée, sommet, chute, catastrophe.",
      en: "Freytag's pyramid — exposition, rise, climax, fall, catastrophe.",
    },
    acts: [
      { fr: "Acte I — Exposition", en: "Act I — Exposition" },
      { fr: "Acte II — Nœud", en: "Act II — Rising Action" },
      { fr: "Acte III — Climax", en: "Act III — Climax" },
      { fr: "Acte IV — Péripétie", en: "Act IV — Falling Action" },
      { fr: "Acte V — Dénouement", en: "Act V — Catastrophe" },
    ],
    beats: [
      { actIndex: 0, color: C.open, title: { fr: "Exposition", en: "Exposition" }, summary: { fr: "On pose le décor et les forces en présence.", en: "Establish the setting and the forces in play." } },
      { actIndex: 1, color: C.rise, title: { fr: "Nœud de l'action", en: "Rising Action" }, summary: { fr: "Les complications se nouent.", en: "Complications tighten." } },
      { actIndex: 2, color: C.crisis, title: { fr: "Climax", en: "Climax" }, summary: { fr: "Le sommet — le destin du protagoniste bascule.", en: "The summit — the protagonist's fate turns." } },
      { actIndex: 3, color: C.fall, title: { fr: "Péripétie", en: "Falling Action" }, summary: { fr: "Les conséquences se déploient ; la tension décroît vers l'issue.", en: "Consequences unfold; tension falls toward the outcome." } },
      { actIndex: 4, color: C.close, title: { fr: "Dénouement", en: "Dénouement" }, summary: { fr: "La catastrophe ou la résolution finale.", en: "The catastrophe or final resolution." } },
    ],
  },
  {
    id: "french-classical",
    name: { fr: "Cinq actes classiques", en: "French Classical (5 Acts)" },
    tagline: {
      fr: "La tragédie classique — protase, épitase, catastase, péripétie, catastrophe.",
      en: "Classical tragedy — protasis, epitasis, catastasis, peripeteia, catastrophe.",
    },
    acts: [
      { fr: "Acte I — Protase", en: "Act I — Protasis" },
      { fr: "Acte II — Épitase", en: "Act II — Epitasis" },
      { fr: "Acte III — Catastase", en: "Act III — Catastasis" },
      { fr: "Acte IV — Péripétie", en: "Act IV — Peripeteia" },
      { fr: "Acte V — Catastrophe", en: "Act V — Catastrophe" },
    ],
    beats: [
      { actIndex: 0, color: C.open, title: { fr: "Protase", en: "Protasis" }, summary: { fr: "Exposition de la situation et des personnages.", en: "Exposition of the situation and characters." } },
      { actIndex: 1, color: C.rise, title: { fr: "Épitase", en: "Epitasis" }, summary: { fr: "L'intrigue se complique, les passions s'échauffent.", en: "The plot complicates; the passions heat up." } },
      { actIndex: 2, color: C.rise, title: { fr: "Catastase", en: "Catastasis" }, summary: { fr: "L'action atteint son plus haut degré de tension.", en: "The action reaches its highest tension." } },
      { actIndex: 3, color: C.turn, title: { fr: "Péripétie", en: "Peripeteia" }, summary: { fr: "Le retournement décisif du destin.", en: "The decisive reversal of fortune." } },
      { actIndex: 4, color: C.crisis, title: { fr: "Catastrophe", en: "Catastrophe" }, summary: { fr: "Le dénouement — souvent funeste.", en: "The dénouement — often fatal." } },
    ],
  },
  {
    id: "free",
    name: { fr: "Structure libre", en: "Free Structure" },
    tagline: {
      fr: "Un seul acte pour commencer — la scène vous appartient.",
      en: "A single act to begin — the stage is yours.",
    },
    acts: [{ fr: "Acte I", en: "Act I" }],
    beats: [
      { actIndex: 0, color: C.open, title: { fr: "Première scène", en: "First Scene" }, summary: { fr: "Posez l'ouverture.", en: "Set the opening." } },
    ],
  },
];

export function getTemplate(id: StructureId): StructureTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function actTitle(structure: StructureId, actIndex: number, lang: Lang): string {
  const t = getTemplate(structure);
  const a = t.acts[actIndex];
  if (a) return a[lang];
  return lang === "fr" ? `Acte ${actIndex + 1}` : `Act ${actIndex + 1}`;
}
