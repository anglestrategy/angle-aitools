# Angle — Product Surface Cut List (draft for Faisal's sign-off)

**Purpose:** kill the "too complicated / clunky" feeling at its source. The UI transplant fixes *craft*; this fixes *scope*. Every route and rail item gets a verdict: **Keep / Merge / Hide / Kill**.

**Ground rules**
- **Hide is free.** Routes go behind a module flag; domain services, schema, and events stay intact. Nothing is lost — it's curation, not amputation.
- **Kill** = remove the surface entirely (code may stay in git history; no flag).
- Parity means *jobs get done*, not *Wrike's IA gets replicated*. We deliberately drop Wrike's scar tissue (Timelog-as-tab-and-view, accounts-page settings maze, legacy redirects).
- v1 buyer: a creative agency. Every Keep must earn its place in their day.

---

## 1. Target shell — 8 destinations (from 24)

```
┌──────────────────────────────┐
│  ⌘K  Search                  │   (overlay, not a destination)
├──────────────────────────────┤
│  Home                        │   today + activity + quick actions
│  Inbox                       │   notifications, mentions, approvals
│  My Work                     │   tabs: Today · Priorities · Starred · Created by me
│  Clients                     │   spaces tree → campaigns → work views
│  Studio                      │   briefs · copy · references · moodboards
│  Delivery                    │   packages · proposals · client approvals
│  Team                        │   tabs: Workload · Timesheets · People
│  Dashboards                  │   tabs: Dashboards · Reports
├──────────────────────────────┤
│  Settings (avatar menu)      │
└──────────────────────────────┘
```

The agency pitch is literally the sidebar: *make work (Clients), do the creative work (Studio), ship it (Delivery), run the shop (Team, Dashboards).* No competitor's sidebar tells that story.

---

## 2. Top-level routes — verdicts

| Route | Verdict | Rationale / where it goes |
|---|---|---|
| `/app/inbox` | **KEEP** | Core daily. Already strong (P3 ✅). |
| `/app/my-work` | **KEEP** | Core daily; becomes the only personal hub. |
| `/app/personal` (Follow-ups/stack rank) | **MERGE → My Work** | "Priorities" tab. A private container is not a destination. |
| `/app/starred` | **MERGE → My Work** | A filter pretending to be a page. |
| `/app/created-by-me` | **MERGE → My Work** | Same. |
| `/app/spaces/*` + `/app/projects/*` | **KEEP** (rename UX to **Clients**) | The work tree. Container views pruned in §4. |
| `/app/studio` | **KEEP — but recast (see §2b)** | Not a hub you visit; tasks *open into* discipline focus modes. Studio becomes the artifact library behind them. |
| `/app/client-portal` | **KEEP** (rename **Delivery**) | Packages, proposals, review links, client accounts — the last-mile loop. Package assembly itself becomes the composition task's focus mode (§2b). |
| `/app/whiteboards/*` | **HIDE (flag)** | Canvas depth unfinished per own tracker; agencies have FigJam. Revisit post-launch. *(Open question #1)* |
| `/app/dashboards` | **KEEP** | Absorbs Reports as a tab. |
| `/app/reports` | **MERGE → Dashboards** | Executive rollup = a report tab, not a third analytics home. |
| `/app/workload` | **MERGE → Team** | One resourcing home, not three. |
| `/app/teams` (Teams Hub) | **MERGE → Team** | Keep capacity/economics; **hide the activity feed** (ClickUp cosplay; Inbox + project activity cover it). |
| `/app/timesheets` | **MERGE → Team** | Tab. Personal week-grid reachable from My Work too. |
| `/app/chat` | **KEEP** | **Faisal's call (2026-06-11): the agency runs on WhatsApp, not Slack — native chat is a real wedge for non-Slack agencies.** Position as the WhatsApp replacement for work: channels tied to clients/campaigns, task-from-message, and later a WhatsApp bridge for client-side comms. Needs the same one-pass UI treatment as everything else. |
| `/app/planner` | **HIDE (flag)** | Project calendar views + My Work cover v1. External calendar sync was deferred anyway. |
| `/app/ai` (AI Hub) | **HIDE the destination** | The governed engine (runs, audit, policy — genuinely good) stays; AI resurfaces as *contextual* assists inside task panel, briefs, inbox digest. A separate AI tab is where AI goes to feel bolted-on. |
| `/app/goals` | **HIDE (flag)** | Agencies don't buy OKR software. Revisit if mid-market demands it. |
| `/app/stream` (global) | **KILL** | Firehose nobody reads. Activity lives on projects/tasks/Home. |
| `/app/calendars` | **KILL folder** | Already a legacy redirect; keep the redirect, delete the rest. |
| `/app/demo` (+ guided presenter) | **HIDE from nav** | Sales tool, not product. Route stays, unlisted. |
| `/app/request-forms` | **MERGE → Settings** | Builder is admin config; public `/forms/[slug]` untouched. |

**Net: 24 → 9 destinations** (Chat stays per Faisal). Nothing a customer would pay for is deleted; ~9 surfaces stop competing for attention.

---

## 2b. Focus Mode — the Studio/Delivery rethink (Faisal's model, 2026-06-11)

**Principle: the workbench is not a place you go; it's what a task becomes when you open it to do the work.**

Every task/subtask carries a discipline (from its container, item type, or assignment). The task panel gets a single prominent **"Enter focus"** toggle that expands the task into a full-screen environment purpose-built for finishing *that* piece of work:

| Task discipline | Focus environment contains |
|---|---|
| **Strategy** | Brief builder, research/benchmark collation, frameworks — the brief is written *inside the task*, not in a separate Studio record |
| **Copy** | Distraction-free editor with the source brief pinned, tone/brand guardrails, AI variants, version diff — deliverable saves back to the task |
| **Design** | Moodboard canvas, inspiration collators (Are.na / Behance / Pinterest-style sources + the existing reference library), AI generation (Magnific / Higgsfield / Flow-class integrations), asset versions — all anchored to the task |
| **Composition (package)** | The package builder *is* this task type's focus mode: pull approved outputs from sibling tasks, QA checklist, send for client approval |
| **BD (RFP)** | Source document with citation overlays, requirements review, proposal drafting (the existing H-BD flow, re-homed into the task) |

Why this is right architecturally: it *completes* what the codebase was already discovering. PRs 61–62 and 174–186 kept dragging Studio context (references, moodboards, briefs, RFP actions) *into the task panel* because users wouldn't leave the task. Focus Mode finishes the thought — instead of summarizing the workbench inside a cramped panel, the task **unfolds into** the workbench. It's also the purest expression of the Angle Graph principle: "discipline work happens on nodes in that graph." The node is the door; the focus environment is the room.

Consequences:
- **Studio (the destination) demotes to a library** — browse all briefs/moodboards/references/copy docs across campaigns. Useful, secondary, not the way work gets done.
- **Delivery (the destination) remains** for the client-facing side (accounts, review queue, what clients see) — but assembling a package happens in the composition task's focus mode.
- The module registry maps `itemType`/discipline → focus surface. New disciplines become new focus modes, not new nav items.
- v1 build order for focus modes: Strategy (brief) → Design (moodboard + sources + AI gen) → Composition (package) → Copy → BD re-home.
- Scope honesty: "Photoshop-equivalent" editing is a later phase — v1 design focus mode is moodboarding, source collation, AI generation, annotation, and versioning; deep raster/vector editing comes via integration first (the project's own ADR-013 precedent: don't rebuild creative suites before the loop works).

---

## 3. Settings — prune ~25 routes to ~12

| Keep | Merge into it | Hide (flag) |
|---|---|---|
| Profile | Accessibility → Profile/Appearance | **Enterprise controls** |
| Appearance | Work schedule (personal) → Profile | **Reliability ops** |
| Users & roles | Work schedules (account) → Time tracking | **Launch readiness** |
| Workflows (statuses) | Item types → Workflows *(open question #2)* | **Support center admin** |
| Custom fields | | **AI usage ledger** (until AI resurfaces) |
| Automations | | **Email deliverability** (ops, not product) |
| Request forms | | |
| Time tracking | | |
| Client delivery (brand/templates) | | |
| Integrations | | |
| Billing | | |
| Security | | |

The hidden six are *internal ops consoles* that ended up inside the customer-facing app. They keep working behind an admin flag; they stop making Settings feel like an airplane cockpit.

---

## 4. Inside a project — view tabs

Primary tabs: **Table · Board · Calendar · Gantt · Files**. Behind "+ view": List, Timelog, Resources, Activity. **Kill Chart** as a container view (Dashboards owns charts) and **Stream** as a named view (it's Activity). Drop the Wrike-ism of Timelog being simultaneously a tab and an add-view.

Public token routes: keep `/forms`, `/dashboard/[token]`, and the three review surfaces — but **merge `/review`, `/proposal-review`, `/copy-review` into one external review experience** (`/review/[token]` dispatching by artifact type). Three differently-styled external surfaces is exactly the clunk clients would see. *(Open question #3)*

---

## 5. Sequencing

1. **After the UI transplant slice lands**, implement the cut as one PR: nav config + module flags (`MODULE_PACKS.md` already specifies the registry shape — this is its first real use). No service deletions.
2. Second PR: kill list (global stream, calendars folder, Chart view) + delete the 8 layered reskin CSS files the transplant supersedes.
3. Then the My Work / Team / Dashboards tab-merges, one surface per PR, each finished to the Flowspace bar.

## 6. Open questions for Faisal

1. **Whiteboards** — hide for v1, or is this a personal must-have for client workshops?
2. **Custom item types** — real agency need, or Wrike-parity reflex? (Hiding it simplifies Workflows settings a lot.)
3. **One unified external review surface** — agree clients should see a single branded review UX for proofs, proposals, and copy?
4. **Naming** — "Clients / Studio / Delivery / Team" vs keeping "Spaces" terminology. The renames are doing real positioning work; veto any that feel off.
5. Anything on the Hide list you actively use today that I've misjudged?
