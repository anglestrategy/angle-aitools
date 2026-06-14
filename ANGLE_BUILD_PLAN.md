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

## 4. Focus Mode — the wedge mechanism (rebuilt)

**What Springboard actually was:** a rough proof of *one discipline's* loop. Its specific machinery — an AI pipeline as the engine, fixed "groundwork→table→document" stages, canvas frames as AI rounds, "send it back" harvesting — is **not the model.** It's strategy's expression of a deeper idea. The deeper idea is what we build.

### 4.1 The model

**A task is the unit of work. When you open it to *do* the work, it expands into a medium-native workspace whose tools, AI role, and definition-of-done match the work's medium — then the output flows back onto the graph as a versioned asset.**

Two corrections to my earlier spec that matter:

- **AI is a companion in the room, not the engine of the room.** A designer may do three manual moodboard iterations with zero AI; a strategist may write longhand. The engine is *a human doing medium-native work, iterating, with feedback expressed on the artifact.* AI assists inside that loop. This decouples Focus Mode from "the AI pipeline works," which de-risks the whole thing — rooms ship and are useful before any AI lands.
- **Medium is the primitive, not discipline.** We don't hand-build five bespoke rooms. We build a **small set of composable surface types**, and a discipline is a *composition* of surfaces + companions + a definition of done. This mirrors Angle's own view-engine philosophy (compile from definitions) and means each surface is built once and reused across disciplines.

### 4.2 The surface types (build these, compose the rest)

| Surface | Medium | Used by |
|---|---|---|
| **Document** | structured text / reasoning | Strategy brief, Copy, BD proposal |
| **Canvas** | spatial arrangement | Design moodboard, mapping, planning |
| **Gallery** | visual collection + generation | Design references/inspiration, AI image/video generations |
| **Package** | assembling other artifacts | Composition → client deliverable |
| **Source-Review** | a source doc + structured extraction | BD (RFP→requirements), contract/brief intake |

A discipline = `{ surfaces[], companions[], definitionOfDone }` in the module registry. Example: **Design** = Canvas + Gallery + {generation provider, reference library, brief-on-shelf} + done-when "concepts approved." **Strategy** = Document + {reasoning AI, frameworks shelf} + done-when "brief approved."

### 4.3 The shared spine (every room, regardless of surface)

1. **Intent** — the brief/definition-of-done, always pinned. The room knows what "finished" means.
2. **The work surface** — one or more of the five types above.
3. **Iterations** — cheap, frequent, autosaved versions. Human drafts, AI generations, or both. **Iteration ≠ approval** (the mistake in my last spec): iterations are local and free; approval is a single deliberate gate when the maker sends the work out of the room.
4. **Direction** — feedback is expressed *in the artifact's native gesture* (annotate a doc, mark up an image, comment on a canvas region) and read by the system as the instruction for the next iteration. This is the durable, generalized version of Springboard's "curation is the interface to AI" — and it works whether the next iteration is human or AI.
5. **Companions** — AI assist, sources/reference library, and reusable house standards (tone rules, frameworks, checklists). Present, not dominant.
6. **Handoff** — output leaves as a versioned F3 asset on the task, optionally into the client **Package**, optionally to the next discipline. Approval is the gate here, using the existing approval lifecycle.

### 4.4 Why this is better architecture

- **Document built once → instantly powers Strategy, Copy, and BD proposals.** Three disciplines from one surface. (My last spec rebuilt overlapping pieces per "room.")
- **AI optional → rooms are useful on day one**, AI deepens them later.
- **New disciplines are configuration, not code** — add a row to the registry, not a new room.
- **Reuses the spine entirely:** iterations = asset versions (F3); approval = approval service; companions = B1 governed AI + reference library + field/standards registry; collection = the composition work item (H-X); everything emits ordinary domain events so inbox/automations/activity work for free.

### 4.5 Build order for surfaces (efficient, not discipline-by-discipline)

1. **Document surface** → ship Strategy + Copy + BD-proposal in one stroke.
2. **Package surface** → the composition/client-deliverable room (the heart of the wedge).
3. **Canvas + Gallery** → Design (the most net-new build; needs a generation-provider adapter).
4. **Source-Review** → re-home BD's existing RFP machinery into a room.

---

## 5. Phased plan

### Phase 0 — Protect & verify (do first, ~days not weeks)
- Make the UI primitive system and the Cut **protected**: document the primitive layer and the 9-destination nav as the canonical surfaces; add a guardrail note (and ideally a lint/CI check) so no surface is rebuilt from old assumptions.
- **Land the Cut** (24→9 destinations) behind module flags — hide/merge, don't delete; services stay intact.
- **Browser-verify the transplant** end-to-end (the sweep that the transplant's deleted screenshot harnesses skipped): every reskinned surface, zero console errors, e2e green. Fix the rough edges 30 agent commits inevitably left.
- Exit criteria: calm 9-destination app, verified, with the UI system protected.

### Phase 1 — The agency wedge, end to end
- One real campaign delivery loop on the calm UI: **intake/request → project & tasks → Strategy brief (Document focus) → Design concepts (Canvas+Gallery focus) → Copy (Document focus) → internal QA → client package (Package focus) → client approval → archive/report.**
- This is Focus Mode §4.5 surfaces 1–3 plus the existing composition + approval + client-review backend, surfaced as rooms.
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
- **Focus surfaces register via the module registry:** `discipline = { surfaces[], companions[], definitionOfDone }`; task → discipline resolves from item type → container default → assignee role, overridable per task. No discipline ⇒ no Focus toggle (plain tasks stay plain).
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

1. **Phase 1 disciplines:** confirm Strategy + Design + Copy + Composition as the first loop (BD/Source-Review deferred to Phase 4)?
2. **Generation provider for the Design Gallery v1:** Magnific, Higgsfield, Flow, or a cheap default to prove the loop first?
3. **Canvas/editor tech:** OK to spend a day-long spike to pick one canvas lib + confirm Tiptap, rather than me decreeing it?
4. **Dogfood target:** which real Angle Strategy engagement is the first one we run through it?
5. **House standards:** seed the Document/Strategy companion with your existing frameworks/brief templates as the default shelf content?
