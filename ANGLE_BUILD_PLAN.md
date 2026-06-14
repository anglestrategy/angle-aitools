# Angle — Build Plan (Corrected): Agency Wedge First

**Status:** Draft for Faisal — 2026-06-14
**Supersedes:** the "Agency OS With Progressive Power" competitor plan, and the room model in `ANGLE_FOCUS_MODE_SPEC.md` (the durable Focus Mode model now lives here, §4).
**Pairs with:** `ANGLE_CUT_LIST.md` (what to remove). This doc is what to build and in what order.

---

## 0. Why the previous plan was wrong

The prior plan was a faithful re-statement of the master plan's Tiers 3→4→5: parity floor → convergence → wedge → workbenches → enterprise. That is the exact sequence that produced ~193 PRs and **nothing at "owner-signed-off, sellable."** Three concrete failures it repeated, and one it caused:

1. **Parity-as-finish-line.** It made the Wrike audit checklist the bar for "done," re-anchoring all energy on matching incumbents instead of on "a creative director would pay for this."
2. **Wedge deferred.** Composition/workbenches — the only thing no competitor has — sat in Phases 3–4, behind a full parity pass and a full convergence pass.
3. **Compete-on-all-axes.** Matching Wrike depth + ClickUp convergence + monday approachability + Asana graph at once is how you build a mediocre everything.
4. **It was blind to the two most recent, most valuable assets** — the Flowspace UI transplant and the destination Cut — so an implementer following it rebuilt cut surfaces and overwrote the UI. That's why it clobbered your work. **This plan makes those assets protected (Phase 0).**

---

## 1. Thesis

Angle wins as **the work OS for agencies that turns strategy, creative, production, and client approval into one connected delivery graph.** Parity is a *trust floor we already largely cleared*, not the product. The product is the **agency delivery loop**, and the thing that makes that loop feel like magic is **Focus Mode**: a task opens into a medium-native workspace where the actual creative work gets done, then flows back onto the graph.

Order of operations is inverted from every prior plan: **protect what's good → ship the wedge on the calm UI → add only the parity depth the wedge touches → dogfood for real → everything else behind flags, only as real use demands.**

---

## 2. Strategic principles (the spine)

- **Wedge first, parity as floor.** Build the agency loop end-to-end before broadening. Parity work is justified only when the loop touches it.
- **Measure against the buyer, not the competitor.** The acceptance question is "would a creative director pay for this and use it daily," not "does it match Wrike row N."
- **Progressive power, honestly.** Calm defaults; depth in context menus, command palette, templates, saved views, and Focus Mode. This is only coherent *with the Cut* — you cannot have calm defaults and 24 destinations. Progressive power and the Cut are one decision.
- **One platform spine.** Everything goes through the existing services: work-item services, domain events, `authorize()`, asset versioning, field registry, module registry. No parallel data models. AI reads only authorized graph data + events.
- **Protected artifacts.** The UI primitive system (Flowspace craft on Angle brand, HeroUI removed) and the destination Cut are load-bearing. No work rebuilds surfaces from scratch or re-expands the nav. Enforced in Phase 0 and assumed by every later phase.

---

## 3. Positioning (keep)

> **The work OS for agencies — strategy, creative, production, and client approval on one delivery graph.**

Competitive framing for reference only (not a build list): Wrike = operational depth (our floor), ClickUp 4.0 = convergence (we cut most of it), monday = approachable workflow building (our progressive-power bar), Asana = graph/AI trust (our spine already does this). We do not chase any of them feature-for-feature.

---

## 4. Department Workspaces — the wedge mechanism

**The primitive is the department, not an abstract "medium."** (An earlier draft proposed "medium is the primitive" for code-reuse reasons — that was wrong: it's an engineer's abstraction that leaks into the product and implies siloed, bolted-together panels. The workspace must be a single cohesive bespoke environment, conceived per department.)

Springboard was a rough proof of *one* department's workspace (Strategy). Its specific machinery — an AI pipeline as the engine, fixed "groundwork→table→document" stages — is not the model. The model is below.

### 4.1 The principle

**Every department owns work at a specific altitude of the graph, and its workspace attaches to the node it owns.** Same idea everywhere; different height. "Open workspace" transforms the platform into a cohesive, bespoke environment built to expedite *that* department's work on *that* node.

| Department | Owns node | Workspace opens from | Kind |
|---|---|---|---|
| **Business Development** | Lead / prospect (pre-client) | the leads/pipeline space | orchestration |
| **Client Servicing** | Client + Project/folder (container) | the client and project | orchestration |
| **Strategy** | Task / subtask (leaf) | the task panel ("Begin task") | maker |
| **Creative** | Task / subtask (leaf) | the task panel ("Begin task") | maker |

- **Makers (Strategy, Creative)** are assigned to leaf tasks; their workspace is **task-scoped** and selected by the task's **discipline/sub-category** (Design, Copy, Strategy…) — not the department. Creative is therefore a *family* of workspaces (Design artboard, Copywriting environment, Motion later), not one.
- **Orchestrators (Client Servicing, BD)** are not assigned to tasks; their workspace is **container-scoped** (client/project for CS) or **pre-client** (leads pipeline for BD).

### 4.2 The delivery pipeline (why these connect)

The four departments aren't separate apps — they're a pipeline down and back up the graph. This *is* the agency wedge:

```
BD lands a lead ──▶ lead converts to Client
        │
Client Servicing authors the brief ──▶ brief spawns tasks/subtasks
        │
Strategy / Creative execute in task workspaces ──▶ output = versioned asset + approval
        │
Client Servicing assembles package, delivers to client (WhatsApp bridge)
```

**Connective tissue (the strongest mechanic): the brief is one object that travels down the graph.** Client Servicing authors it at project level; it spawns tasks; the same brief is pinned in the maker's task workspace as the definition of "done." No competitor threads a single brief from client comms → task creation → maker workspace → delivery.

### 4.3 Maker workspace (task-level: Strategy, Creative)

Entered via **Begin task** on the task panel; the panel expands full-screen into one cohesive environment for that discipline. Example — **Design**:

- Inspiration/reference browsing (Pinterest/cosmos.so/are.na/Behance/ArtStation-class), woven in, not a separate tab.
- Canvas/artboard for actual design work (Photoshop/Illustrator-direction; see scope note).
- Generative AI (Magnific/Higgsfield/GoogleFlow/Krea/Weave-class) as a companion, not the engine.
- Collaboration with other makers, draft save/share, resume later, export, and **send final version → the task** as the approved deliverable.

Shared spine under every maker workspace: **Intent** (the brief, pinned) · **Iterations** (cheap autosaved versions — human *and/or* AI; iteration ≠ approval) · **Direction** (feedback in the artifact's native gesture — mark up the image/canvas — read as the next instruction) · **Companions** (AI, references, house standards) · **Handoff** (versioned F3 asset + approval back to the task).

**Two laws:** (1) **Cohesion** — it is one woven environment, never visibly assembled "surfaces" sitting side by side. (2) **AI is a companion** — the workspace is fully useful with AI disabled; AI deepens it, doesn't drive it.

### 4.4 Orchestration workspaces (container-level: Client Servicing, BD)

- **Client Servicing** (opens from a client or project): client **communication** tools — the **WhatsApp bridge** lives here (client comms, distinct from internal team chatter) — plus **brief authoring** that feeds task/subtask creation, plus a **management overview** of every task/subtask under the client/project. This is the orchestration cockpit, not a maker canvas.
- **Business Development** (opens from the leads/pipeline space): work **leads and potential clients** (CRM-like), qualify and pursue, and **convert a won lead → client**, handing off to Client Servicing. Pre-client, so it never attaches to tasks.

### 4.5 Implementation note (reuse stays invisible)

Shared engines may exist under the hood (a text editor, a canvas renderer, the asset/version system, the gen-AI adapter, comms). They are **invisible plumbing**, never the organizing concept, and never at the cost of each workspace feeling bespoke and cohesive. Disciplines/departments register in the module registry as `{ ownsNode, openFrom, environment, companions, definitionOfDone }`. Everything maps onto the spine: iterations = asset versions (F3); approval = approval service; brief = a work-item/asset that links container → tasks; comms = events + the WhatsApp bridge; all actions emit ordinary domain events so inbox/automations/activity work for free.

### 4.6 Build order (one vertical slice, not all four at once)

A bespoke workspace — especially a real artboard — is a large build. Prove the wedge with **one delivery vertical**, then widen:

1. **Client Servicing brief authoring** (container) → spawns tasks carrying the brief.
2. **One maker workspace — Design** (most differentiated; inspiration + gen-AI + lighter native editing in v1) → produces the asset.
3. **Client Servicing package + deliver** (assembly + client approval + WhatsApp bridge).

That single loop — brief → design → deliver — is the demoable wedge. Strategy/Copy makers, BD pipeline, and deeper artboard editing follow once the loop is real.

---

## 5. Phased plan

### Phase 0 — Protect & verify (do first, ~days not weeks)
- Make the UI primitive system and the Cut **protected**: document the primitive layer and the 9-destination nav as the canonical surfaces; add a guardrail note (and ideally a lint/CI check) so no surface is rebuilt from old assumptions.
- **Land the Cut** (24→9 destinations) behind module flags — hide/merge, don't delete; services stay intact.
- **Browser-verify the transplant** end-to-end (the sweep that the transplant's deleted screenshot harnesses skipped): every reskinned surface, zero console errors, e2e green. Fix the rough edges 30 agent commits inevitably left.
- Exit criteria: calm 9-destination app, verified, with the UI system protected.

### Phase 1 — The agency wedge, end to end
- One real campaign delivery vertical on the calm UI (the §4.6 slice): **Client Servicing authors a brief → brief spawns tasks → Designer opens the Creative/Design workspace ("Begin task") and produces concepts → internal QA → Client Servicing assembles the package → client approval (WhatsApp bridge) → archive/report.**
- Reuses the existing composition + approval + client-review backend; the new build is the brief-authoring workspace, the Design maker workspace, and the package/deliver cockpit.
- Exit criteria: a real brief becomes an approved, client-delivered package without leaving Angle — verified in browser.

### Phase 2 — Parity depth the wedge actually touches
- **Only** the parity work the Phase-1 loop exercises: task panel depth, assets/proofing depth, approvals, request forms, the views used in the loop. Not the ~90-box matrix.
- Parity rows are closed when the *loop* needs them, verified against real use — not against the Wrike checklist for its own sake.

### Phase 3 — Dogfood
- Run a real Angle Strategy client engagement through it. **This — not an audit doc — generates the next backlog.** The real clunk only surfaces here.
- Reframe **Chat** during/after this as the **WhatsApp-replacement wedge** (channels tied to clients/campaigns, task-from-message, then a WhatsApp bridge so clients keep WhatsApp while messages land on the campaign) — built because your agency actually needs it, not as generic C1.

### Phase 4 — Breadth, only as demand proves it (all behind flags)
- Source-Review focus (BD re-home), remaining disciplines, and any convergence module (planner, teams hub, etc.) only when dogfooding or a real prospect demands it. Default off.

### Phase 5 — Enterprise readiness
- SSO/SCIM, audit UI, export/retention, mobile, deeper integrations, template marketplace — last, once the loop is reliable. (The prior plan got this sequencing right; keep it.)

---

## 6. Interfaces & data

- One spine, reused: work-item services, domain events, `authorize()`, F3 asset versioning, field/standards registry, module registry.
- **Department workspaces register via the module registry:** `{ ownsNode, openFrom, environment, companions, definitionOfDone }`. Maker workspaces resolve by the task's discipline (item type → container default → assignee role, overridable per task); no discipline ⇒ no "Begin task" workspace (plain tasks stay plain). Orchestration workspaces (CS, BD) attach to client/project and lead nodes. Access follows the node + assignment, not a per-user department lock.
- **`composition`** is the differentiating work-item type: links approved briefs, copy, designs, files, QA items, and client-approval state; the Package surface is its room.
- Events to formalize in EVENT_CATALOG: package created / item changed, iteration saved, review submitted, approval/change requested, reminder, chat-to-task link, AI summary produced, client-facing audit entry. Iterations are asset-version events; approvals are approval events — **kept distinct.**
- **One canvas tech and one editor tech, reused everywhere** (candidates: a synced canvas lib for Canvas/Gallery + whiteboards; Tiptap for Document, already deep). Pick via a short spike — not decreed here.
- AI: governed B1 runs only; authorized graph + events; one `GenerationProvider` adapter for image/video (Magnific/Higgsfield/Flow-class + a default); outputs are F3 assets with provenance edges.

---

## 7. Test plan

- **Primary: the golden path e2e** — campaign → intake → work → brief → asset/proof → package → approval → decision, exercised through the real rooms.
- **Primary: dogfood** — a real client engagement completes inside Angle (the strongest signal).
- **Floor: parity audits** — run only on the rows the loop touches; foundation routes never count as done.
- **Regression:** guest/client-approver permissions, public links, AI summaries, chat-to-task, dashboard filters, rich text, responsive shells, **and** the protected-UI/nav guardrail.
- **Acceptance metrics:** a creative director completes a campaign delivery unaided; no dead-end stubs in primary flows; every new mutation emits expected events; the nav stays at the cut set; the UI system is untouched by feature work.

---

## 8. Guardrails (the part the last plan lacked)

1. **Do not rebuild surfaces or re-expand nav.** Primitives + Cut are protected. New work composes them.
2. **No parity-treadmill.** A parity row may be picked up only when a wedge flow needs it.
3. **Everything non-wedge ships behind a flag, default off.**
4. **AI never becomes a room's load-bearing engine** — rooms must be useful with AI disabled.
5. **Verify in a real browser with evidence before "done."** No foundation-only merges.

---

## 9. Open questions for Faisal

1. **Phase 1 vertical:** confirm the first loop is Client Servicing brief → Design maker workspace → CS package/deliver (Strategy/Copy makers and BD pipeline deferred)?
6. **Strategy altitude:** task-scoped only, or does Strategy also need a project-level workspace (campaign strategy as a project artifact)?
7. **Disciplines under each department:** confirm the full list (e.g. Creative → Design, Copy, Motion?) so the registry is sized right.
2. **Generation provider for the Design Gallery v1:** Magnific, Higgsfield, Flow, or a cheap default to prove the loop first?
3. **Canvas/editor tech:** OK to spend a day-long spike to pick one canvas lib + confirm Tiptap, rather than me decreeing it?
4. **Dogfood target:** which real Angle Strategy engagement is the first one we run through it?
5. **House standards:** seed the Document/Strategy companion with your existing frameworks/brief templates as the default shelf content?
