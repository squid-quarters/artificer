# Artificer

Artificer is card layout software for designers of TCGs, LCGs, board games,
Tarot, and general cards. Humans and AI agents should be able to author cards
within explicit layout and print constraints. MCP integration is a core product
requirement, not an optional automation layer.

## Documentation-only recovery candidate

This candidate contains documentation only. **Application source, sample assets,
dependencies, bundled skills, and executable tooling are not included.** It is
prepared for review and has not been published. It cannot run the prototype.

At recovery on 12 October 2026, the matching
[GitHub repository](https://github.com/squid-quarters/artificer) was empty:
no branches, commits, issues, or PRs. A separately preserved local prototype
renders an eight-card demo gallery, two Svelte templates, backgrounds, a Tauri
shell, and an Effect runtime smoke module.

Card persistence, an editor, CLI, MCP server, image/sheet export, layout
validation, and print preflight are **not implemented**. The earlier README's
export feature list described intent, not working features.

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
independent adversarial review, fixes, and final checks. The empty remote needs
an explicitly approved bootstrap; subsequent changes must use scoped PRs.
Public publication approval is pending. No source or sample publication is
implied by this documentation candidate.
