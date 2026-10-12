import { invoke } from "@tauri-apps/api/core";
import type { Project, Proposal, Validation } from "#lib/model.ts";
export const bridge = {
  open: (path: string) => invoke<Project>("open_project", { path }),
  project: () => invoke<Project>("read_project"),
  proposals: () => invoke<Proposal[]>("list_proposals"),
  asset: (id: string) => invoke<string>("read_asset", { id }),
  recover: () => invoke<void>("recover_lock"),
  validate: (id: string, revision: number, snapshot: Proposal, report: Validation) =>
    invoke<void>("record_validation", { id, revision, snapshot, report }),
  accept: (id: string, revision: number) => invoke<Project>("accept_proposal", { id, revision }),
  propose: (
    revision: number,
    cardId: string,
    body: string | null,
    variantId: string | null,
    kind: "edit" | "undo" = "edit",
  ) => invoke<Proposal>("editor_proposal", { revision, cardId, body, variantId, kind }),
};
