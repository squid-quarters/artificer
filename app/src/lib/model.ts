export type Region = { x: number; y: number; width: number; height: number };
export type Template = {
  id: string;
  width: number;
  height: number;
  body: Region;
  titleRegion?: Region;
  titleFontPx?: number;
  titleLineHeightPx?: number;
  fontPx: number;
  minFontPx: number;
  lastLineMinWords: number | null;
  symbol: { glyph: string; id: string; x: number; y: number };
  variants: { id: string; artAssetId: string }[];
  permittedOverrides: string[];
};
export type Card = {
  id: string;
  title: string;
  body: string;
  templateId: string;
  variantId: string;
};
export type Project = {
  schemaVersion: 1;
  contentHash?: string;
  symbols: { id: string; glyph: string; x: number; y: number }[];
  revision: number;
  label: string;
  assets: { id: string; path: string; sha256: string; provenance: string }[];
  templates: Template[];
  cards: Card[];
  history: { cards: Card[]; commandId: string }[];
  printProfile: null;
};
export type Proposal = {
  id: string;
  expectedProjectHash: string;
  expectedRevision: number;
  cardId: string;
  body: string | null;
  variantId: string | null;
  kind: "edit" | "undo";
  status: "pending" | "accepted";
  acceptedRevision: number | null;
  title?: string | null;
};
export type Diagnostic = { code: string; regionId: string; message: string };
export type Validation = {
  status: "pass" | "fail";
  diagnostics: Diagnostic[];
  finalLineWords: number;
  lineCount: number;
  environment: string;
};
export function candidate(project: Project, proposal: Proposal): Project {
  const next = JSON.parse(JSON.stringify(project)) as Project;
  if (project.contentHash && project.contentHash !== proposal.expectedProjectHash)
    throw new Error("Project changed before rendering");
  if (project.cards.length !== 1) throw new Error("First slice supports one card");
  if (proposal.expectedRevision !== project.revision) throw new Error("Revision conflict");
  if (proposal.kind === "undo") {
    const previous = next.history.at(-1);
    if (!previous) throw new Error("Nothing to undo");
    next.cards = structuredClone(previous.cards);
    return next;
  }
  const card = next.cards.find((c) => c.id === proposal.cardId);
  if (!card) throw new Error("Unknown card");
  const template = next.templates.find((t) => t.id === card.templateId);
  if (!template) throw new Error("Unknown template");
  if (proposal.title != null) {
    if (!template.titleRegion) throw new Error("Title editing requires a declared template region");
    card.title = proposal.title;
  }
  if (proposal.body !== null) card.body = proposal.body;
  if (proposal.variantId !== null) {
    if (!template.permittedOverrides.includes("variantId"))
      throw new Error("Variant override forbidden");
    if (!template.variants.some((v) => v.id === proposal.variantId))
      throw new Error("Unknown variant");
    card.variantId = proposal.variantId;
  }
  return next;
}
