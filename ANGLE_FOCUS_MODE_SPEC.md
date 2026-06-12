# Angle — Focus Mode Specification

**Status:** Draft v1 for Faisal's sign-off — 2026-06-12
**Replaces:** Studio-as-destination model (see [ANGLE_CUT_LIST.md](./ANGLE_CUT_LIST.md) §2b)
**Informed by:** Springboard (`springboard-cloud`) mechanics · Angle platform services (F1 events, L1 work items, F3 assets/approvals, B1 governed AI, module registry) · Flowspace craft bar
**Audience:** the implementation session working on `angle-pm` post-UI-transplant

---

## 1. The principle

**A workbench is not a place you go. It is what a task becomes when you open it to do the work.**

Every task carries a discipline. The task panel shows one prominent toggle — **Enter focus** — and the task unfolds into a full-screen room purpose-built for finishing *that* piece of work. Output saves back to the task. Exit returns to wherever you were.

Three laws, extracted from Springboard, that every room must obey:

1. **Curation is the interface to AI.** Humans star, edit, annotate, and rewrite; the system reads that as direction. There is no chat box. "Send it back" harvests what the team marked up and feeds it to the next round.
2. **Nothing leaves the room.** Research, sources, drafts, feedback, versions, and the client-bound collection all live in one place that deepens. If a step requires another tab, the room failed.
3. **Plain language everywhere.** "It's arguing with itself…", "it holds / not yet / holds, with notes", "send it back", "pick it back up", "set aside." No SaaS-speak, no spinner-with-percent. Status is narrated, not coded.

---

## 2. Anatomy of a room (shared template)

Every focus mode is an instance of one room template:

```
┌──────────────────────────────────────────────────────────────────────┐
│            ◄ floating work bar (glass pill, top-center) ►            │
│   [client · round n] [assignment]  |  Stage₁ Stage₂ Stage₃  | Rounds │
│   Collection  Shelf                                                  │
│                                                       ┌────────────┐ │
│                                                       │ status /   │ │
│         THE  SURFACE                                  │ decision   │ │
│         (canvas / editor /                            │ pill (top- │ │
│          board / source doc —                         │ right)     │ │
│          per discipline)                              └────────────┘ │
│                                                       ┌────────────┐ │
│                                                       │ Collection │ │
│                                                       │ rail       │ │
│                                                       │ (toggle)   │ │
│                                                       └────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**Shared elements (build once, in `src/components/focus/`):**

| Element | Behavior |
|---|---|
| **Entry/exit** | `?focus=1` on the task URL. Spring scale-up takeover from the task panel; Esc or ✕ returns to the exact prior context. Deep-linkable and shareable. |
| **Work bar** | Floating glass pill, top-center: context (client · assignment · round), **stages** (room-specific, max 3; locked stages visible with "comes alive once…" tooltips), Rounds, Collection, Shelf toggles. Active stage = solid ink pill. |
| **Status pill** | Top-right. While AI works: narrated step ("researching the market…") + step dots + a quiet `stop`. When gated: verdict ("holds, with notes") + **Approve** / **Send it back**. Failed: **Pick it back up**. |
| **Rounds** | Every send-back creates a new round on the same surface. "How the work descended" overlay = jumpable round tree. Rounds are never deleted. |
| **Send it back** | Reads the surface (annotations, rewrites, stars), summarizes in plain words what travels ("Taking with it: 3 notes across 2 areas and 1 card your team rewrote"), takes one optional free-text note, dispatches the next round. |
| **The Shelf** | Slide-in panel: house standards for this discipline (question banks, tone rules, principles, specs) — readable while working, editable in Settings. |
| **The Collection** | Resizable right rail (Springboard's deck, generalized): from anywhere in any room, "pull aside" any material into the campaign's client package. This is continuous composition — assembly happens during the work. |
| **Presence** | Other people's cursors/edits live on the surface (tldraw sync where the surface is a canvas); a viewer joining a running round polls instead of double-driving it. |
| **Tab title** | When work lands while the tab is hidden: `◉ Ready for review · Angle`. |

---

## 3. Mapping onto Angle's platform (no new spine)

Everything reuses what's built. **No parallel data model.**

| Room concept | Angle implementation |
|---|---|
| Room registration | `ModuleDescriptor` gains `focusMode?: { itemTypes, disciplines, component, stages }`. Discipline resolves from item type → container default → assignee role, overridable on the task. |
| AI rounds | **B1 governed runs** (`ai_run` + steps), with the existing policy, token/cost ledger (PR-18d), and audit history. Springboard's drive-loop becomes a client of the governed run queue. |
| Round outputs | **F3 asset versions** on the task (`asset.version_added`), so proofing, packages, and the client hub see them natively. |
| Approve / send back | Existing **approval service** (`approval.requested/decided`) — the room is a felt skin over the same lifecycle the client hub uses. |
| Canvas surfaces | **tldraw + @tldraw/sync** (Springboard-proven). One persistent canvas per work item; each round lands as a frame band. **Revisit ADR-015:** native canvas is superseded; D-WB whiteboards adopt tldraw too — one canvas stack everywhere. |
| Doc surfaces | Tiptap (already deep via P1d) for copy/brief documents. BlockNote not adopted — two editors is one too many. |
| Annotation harvest | Canvas: diff round-frame shapes (notes, rewrites, stars) at send-back time. Docs: tracked suggestions + inline comments. Harvest → structured `feedback` on the run (existing endpoint pattern). |
| The Collection | Items append to the campaign's **composition work item** (H-X) via a `dock` service; `composed_into` edges per ANGLE_GRAPH. The Composition room (§4.4) is that same work item's own focus mode. |
| Events | Reuse `work_item.*`, `asset.*`, `approval.*`, `ai.run_*`. **New, to add to EVENT_CATALOG:** `focus.round_started`, `focus.round_gated`, `focus.round_sent_back`, `focus.collection_added`. Inbox/automations/activity subscribe like any event. |
| Permissions | `authorize()` actions: `focus.enter`, `focus.run`, `focus.decide`, `focus.collect`. Client-visibility flags on collection items reuse P9 + client-delivery policy. |
| Gen-AI providers | One `GenerationProvider` adapter interface (image/video/upscale: Magnific/Higgsfield/Flow-class, plus a default built-in). Keys in Settings → Integrations; every call through the B1 ledger; outputs are F3 assets with `generated_from` edges to prompt + run. |

---

## 4. The five rooms

### 4.1 Strategy (port Springboard — build first)

- **Stages:** *The groundwork → The table → The document.*
- **Groundwork:** the workspace's **house question bank** (Settings-editable; Springboard's 461-question model as the seed) auto-settled by a governed run; strategist curates — edit answers, **star foundations**, mark "stays with the client"; AI pre-suggests a shortlist when settling finishes; editing a settled cluster re-settles just that cluster.
- **The table:** "Build on this" → strategy pipeline (classify → research → diagnose → insight → draft → red-team → **gate** → revise) lands the round as frames on the canvas. Team annotates/rewrites on the canvas; send-back carries it.
- **The document:** the same round rendered as a clean Tiptap doc, easing in over the table.
- **Outputs to task:** approved brief/strategy as a versioned asset; H-S brief records become this room's storage (existing brief→work-plan generation keeps working).

### 4.2 Design

- **Stages:** *The sources → The board → The concepts.*
- **Sources:** reference library + inspiration (H-D-REF/INSPIRE — collections, URL snapshots, uploads, embedding similarity already built) presented as a collator: paste any URL (Are.na/Behance/Pinterest/anything), import queue snapshots it; brief pinned on the Shelf.
- **The board:** moodboard as tldraw canvas — drag sources on, arrange, annotate; PR-56/57 moodboard composition data re-homed here.
- **The concepts:** generation rounds via provider adapters; each generation = versioned asset frames on the canvas; **annotate → send it back → regenerate** with the marks as direction; side-by-side version compare (F3d).
- **Scope honesty:** v1 is moodboard + collation + generation + annotation/versioning. Raster/vector editing ("Photoshop-equivalent") is a later phase via integration first (ADR-013 precedent).

### 4.3 Copy

- **Stages:** *The brief → The draft → The read.*
- Center: distraction-free Tiptap editor; Shelf pins source brief + tone/brand guardrails + legal checklist (all existing H-C).
- Variants and revisions are rounds (PR-19d/49 diff + rollback re-homed); *The read* = clean preview with reviewer routing (PR-50) and the scoped legal/client links (PR-53) issued from the room.
- **Output:** published copy-doc version → collection-ready.

### 4.4 Composition (the package room)

- The composition work item's own focus mode — **the Collection rail grown into a room.** Stages: *The material → The package → The approval.*
- Pull approved outputs from sibling tasks; arrange/sequence; internal QA checklist; one click issues the **single unified client review link**; client decisions flow back through the same approval events.
- Existing H-X package loop provides the entire backend; this room replaces its current admin-style UI.

### 4.5 BD (re-home, build last)

- **Stages:** *The source → The requirements → The proposal.*
- PR-36…48 machinery (PDF citation overlays, compliance matrix, proposal lifecycle, review links, CRM handoff) mounted as a room instead of scattered task-panel actions; proposal versions = rounds; gate = client decision.

---

## 5. Daily-PM integration

- **Enter focus** appears: in the task panel (primary, top), on table/board row hover (door icon), and via `F` with a task selected. Tasks with room activity show a quiet door badge + round count.
- Room activity emits ordinary events → inbox ("Round 3 is ready for review"), automations ("when focus.round_gated → notify account lead"), and the activity stream all work with zero new plumbing.
- Approving a final round can advance the task's workflow status (per-container setting).
- A task without a discipline shows no toggle — plain tasks stay plain. Focus Mode is additive, never required.

## 6. Build order & acceptance

| Slice | Scope | Done when |
|---|---|---|
| **FM-0** | Room shell: registry, `?focus=1` takeover, work bar, status pill, Shelf, exit; tldraw canvas + sync infra; EVENT_CATALOG additions | Enter/exit from table + panel feels Flowspace-grade; browser evidence |
| **FM-1** | **Strategy room** end-to-end (groundwork → table → rounds → document), governed runs, send-back harvest | A real brief goes intake → approved strategy without leaving the room; round 2 demonstrably reflects canvas notes |
| **FM-2** | **Collection rail** everywhere + dock service into composition item | Pull-aside from strategy room appears in the campaign package |
| **FM-3** | **Design room** (sources + board + one generation provider + annotate-regenerate) | Moodboard→generation→feedback→regeneration loop verified in browser |
| **FM-4** | **Composition room** + unified client review link | Package assembled from FM-1/FM-3 outputs; client approves via one branded link |
| **FM-5** | **Copy room**, then **BD re-home** | Existing H-C/H-BD flows reachable only through rooms; old scattered UI removed |

Every slice: verified in a running browser with screenshots, zero console errors, and the plain-language pass (no jargon strings merged). No slice ships "foundation-only."

## 7. Open questions for Faisal

1. **Strategy pipeline brain:** port Springboard's exact step pipeline (classify→…→revise) as the v1 strategy run, or redesign the steps first?
2. **House questions:** seed Angle with your Springboard question bank as the default Shelf content?
3. **Generation providers for v1 design room:** which one first — Magnific, Higgsfield, Flow, or a cheap default (e.g. Gemini/Flux via API) to prove the loop?
4. **Naming:** "Enter focus" vs "Open the room" vs a brand word (e.g. "Springboard" lives on as the strategy room's name?).
5. **Realtime collab on canvases:** tldraw sync needs a small WS worker (Springboard ran one on Cloudflare). OK to add that piece of infra now, or single-editor-with-refresh for FM-1?
