# Artificer

Artificer is card layout software for designers of TCGs, LCGs, board games,
Tarot, and general cards. Humans and AI agents should be able to author cards
within explicit layout and print constraints. MCP integration is a core product
requirement, not an optional automation layer.

## Documentation-only recovery candidate

This candidate contains documentation only. **Application source, sample assets,
dependencies, bundled skills, and executable tooling are not included.** The reviewed documentation baseline is now published. It cannot run the
prototype.

At recovery on 12 October 2026, the matching
[GitHub repository](https://github.com/squid-quarters/artificer) was empty:
no branches, commits, issues, or PRs. A separately preserved local prototype
renders an eight-card demo gallery, two Svelte templates, backgrounds, a Tauri
shell, and an Effect runtime smoke module.

Card persistence, an editor, CLI, MCP server, image/sheet export, layout
validation, and print preflight are **not implemented**. The earlier README's
export feature list described intent, not working features.

The owner selected desktop/local-first Tauri and dense TCG/LCG cards as the first
workflow. Browser delivery is later feasibility work. Stable dependency upgrades
are authorized in an isolated local copy; see [upgrade direction](docs/upgrade.md).

The recovered stack uses Svelte 5, SvelteKit, Tailwind v4, Vite, Effect, Vitest,
Playwright, Storybook, and Tauri 2. This describes existing code; it does not
select architecture for future implementation.

## Product and process

- [Recovery evidence and historical intent](docs/recovery.md)
- [Existing architecture and unresolved print dimensions](docs/architecture.md)
- [Product requirements and proposed constraint behavior](docs/product.md)
- [Reconciled backlog](docs/backlog.md)
- [Pending decisions](docs/decisions.md)
- [Sourced design research](docs/design-research.md)
- [Verification scope](docs/verification.md)
- [Publication and licensing inventory](docs/publication.md)

Read [AGENTS.md](AGENTS.md) before changing the project. All integration requires
independent adversarial review, fixes, and final checks. The approved baseline is
[commit 370ca99](https://github.com/squid-quarters/artificer/commit/370ca99124d43c817b4ba5c691c71e92abc9c41a); subsequent changes must use scoped PRs.
The documentation bootstrap was approved and completed; subsequent changes use
reviewed PRs. No source or sample publication is
implied by this documentation candidate.
