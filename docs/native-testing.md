# Native interaction test process

A helper can find an Artificer window while unscoped input reaches another app.
These rules govern native tests separately from source checks and headless
browser tests. They correct the test process; they do not add an input controller
or change application behavior, MCP authority, permissions, schema or print rules.

## Prepare a bounded slot

Obtain explicit foreground ownership before launching a native test window.
Record the reviewed commit, executable/build mode, disposable project snapshot
and intended checks. Use one Artificer window and synthetic owned assets.
Preserve existing projects, pending proposals and prior evidence. Recheck disk
state after an interrupted attempt before repeating acceptance or undo.

Check actual session lock state, available controller and relevant permission
preflights. Name the exact host/operation if access is unavailable; do not infer
a denied consent prompt from a false preflight. Do not repeatedly invoke a
waiting permission probe or change permissions yourself. Missing controller,
permission or session availability leaves the dependent check unverified.
Temporary activity assertions may last only for the assigned test run; they
must not change persistent settings or bypass a session lock.

## Gate every input batch

Before each batch, independently verify all of the following:

- The slot still belongs to this operator and the user is not actively using
  another app. User activity overrides earlier slot ownership.
- The GUI session is unlocked and the expected live Artificer process and exact
  window still exist. Record process identity, PID and window identity.
- The actual system foreground matches the target, and the intended native
  control has the required focus. A successful activation request or an
  accessibility/DOM focus flag alone is insufficient.
- The input route explicitly addresses that verified process/window and its
  observable result can be checked.

If any check is unknown or changes, stop before sending input. Keep each batch
small and recheck after focus/navigation transitions. Use process/window-scoped
delivery; global HID posting and other unscoped input are prohibited as a
fallback. A foreground check does not turn unscoped input into scoped delivery
or prevent a later focus change. Do not broaden the route to make a stuck or
inconclusive attempt appear complete.

## Record delivery and outcome

For each emitted event, record its UTC time, event type/key code and modifiers,
delivery route, target process/window, and the batch's verified foreground/focus
state. Send key-down and key-up to the same verified target and record both.
Balanced emission does not prove balanced receipt. Do not send generic release
or cleanup keys to whichever app happens to be foreground.

Observe the requested effect through a supported controller or native UI
evidence and, for persistence, the disposable project bytes/revision/receipt.
An API returning success, a printed "key posted", an intended target or a
screenshot of a focused element is not proof that an input event arrived or
that the workflow passed. If delivery/effect cannot be established, stop that
interactive check, preserve the attempt and report it as unverified. Continue
source analysis separately without borrowing foreground again.

Keep these evidence categories distinct:

- Headless Chromium/Playwright WebKit with the development bridge verifies its
  tested DOM/backend workflows, not native WKWebView input, IPC/CSP or parity.
- Native build success verifies compilation, not an interaction.
- Native observed UI and disk outcomes verify only those specific workflows.
- Failed test preconditions and inconclusive input attempts do not establish an
  application defect. An observed rejection can be the expected guard behavior.

Use an isolated reviewed fix/PR only when evidence establishes a source defect.
Do not label browser results or emitted events as native keyboard acceptance.

## Pause and release

Stop immediately if the user starts interacting, ownership changes, the session
locks, or event delivery becomes inconclusive. Do not seize focus to recover a
test while another app is in use. Inspect only the controlled test's existing
state/evidence; no cleanup input may be injected into the user's app.

If a persistence operation was interrupted, inspect its actual project/proposal
state before retrying; do not blindly repeat a commit. Close only the controlled
test app when safe, end its temporary activity assertion/helpers, verify closure,
and explicitly report foreground release and remaining checks.

Preserve incident audits and failed attempts with their original timestamps and
hashes outside the public repository. Never invent exact event timestamps or
recipients; identify artifact time brackets as brackets. Review any public
process correction through the normal scoped PR workflow. This document grants
no new permission, integration, publishing or broader redesign authority.
