import { describe, expect, test } from "vitest";
import { candidate, type Project, type Proposal } from "./model.ts";
import fixture from "../../../fixtures/neutral-project/project.artificer.json";
const project = fixture as Project;
const proposal: Proposal = {
  id: "test",
  expectedProjectHash: "fixture",
  expectedRevision: 1,
  cardId: "fixture-card",
  body: "Gain two focus.",
  variantId: null,
  kind: "edit",
  status: "pending",
  acceptedRevision: null,
};
describe("candidate commands", () => {
  test("does not mutate source or rewrite rules", () => {
    const result = candidate(project, proposal);
    expect(result.cards[0].body).toBe(proposal.body);
    expect(project.cards[0].body).not.toBe(proposal.body);
    expect(result.revision).toBe(1);
  });
  test("rejects stale revision", () =>
    expect(() => candidate(project, { ...proposal, expectedRevision: 0 })).toThrow(
      "Revision conflict",
    ));
  test("rejects unknown variant", () =>
    expect(() => candidate(project, { ...proposal, variantId: "detached-frame" })).toThrow(
      "Unknown variant",
    ));
  test("alternate art keeps the same gameplay record and shared symbol", () => {
    const result = candidate(project, { ...proposal, body: null, variantId: "alternate" });
    expect(result.cards[0].id).toBe(project.cards[0].id);
    expect(result.cards[0].body).toBe(project.cards[0].body);
    expect(result.templates[0].symbol).toEqual(project.templates[0].symbol);
  });
});
