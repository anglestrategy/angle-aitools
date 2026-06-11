# Flowspace

**Your work, finally in flow.** Flowspace is a full-featured work-management platform — a complete Wrike / Monday / ClickUp-class web app with a Liquid Glass UI, springy motion design, and MingCute iconography.

## Run it

```bash
cd flowspace
npm install
npm run dev   # http://localhost:3000
```

Open the landing page, hit **“Open the demo workspace”**, and sign in as any teammate. The whole app runs on a client-side data layer (Zustand + Immer) persisted to `localStorage` and pre-seeded with a realistic workspace — every interaction (drag & drop, automations, comments, timers) is fully live. Use **Settings → Danger zone → Reset demo data** to start fresh.

## What's inside

### Work management core
- **Workspace → Spaces → Projects → Tasks → Subtasks** hierarchy with private spaces, favorites, recents
- **8 project views:** Overview (stats + charts), List (grouped, inline-editable), Board (Kanban with dnd-kit drag & drop), Table (spreadsheet w/ editable custom-field columns), Calendar (drag to reschedule), Gantt (drag/resize bars), Workload (capacity heat per person), Activity feed
- **Tasks:** statuses (per-project workflows), priorities, multi-assignees, watchers, tags, start/due dates, estimates, story points, checklists, attachments, cover gradients, dependencies (blocked-by / blocking with a live "Blocked" badge), comments with reactions & @mentions, full activity history, time tracking with a live global timer
- **Custom fields:** text, number, select, multi-select, date, checkbox, URL, currency, rating, people, progress — editable in Table view and the task panel
- **Filtering/grouping/sorting** persisted per project, shared across views

### Platform features
- **Automations:** no-code rule builder (trigger → conditions → actions) with a real execution engine that runs on store mutations (assign, move, tag, comment, notify, archive, create subtasks…)
- **Docs:** Tiptap rich-text editor with covers, icons, task lists
- **Goals/OKRs:** measurable key results with live progress
- **Dashboards:** widget library (status donut, assignee bars, completion trend, time tracked, workload, goals, upcoming, activity…) on a 12-column grid
- **My Tasks, Home, full-page Inbox** with notification types (assigned, mention, comment, status, due-soon, automation)
- **Timesheet:** weekly grid with parseable duration entry ("1h 30m")
- **Command palette (⌘K):** fuzzy jump to any task/project/doc/person/action; `N` = new task
- **Integrations gallery, workspace settings, members & roles, tags, import/export**

### Design system
- **Liquid Glass:** layered translucent surfaces (`glass`, `glass-card`, `glass-strong`), specular sheen sweeps, aurora mesh background with grain
- **Motion:** spring-physics transitions throughout (framer-motion), layout animations, animated tab indicators
- **Icons:** MingCute via Iconify

## Architecture

```
src/
  lib/            types.ts (domain) · store.ts (Zustand data layer + automation engine)
                  selectors.ts (filter/group/sort) · seed.ts (demo workspace) · utils.ts
  components/
    ui/           glass primitives, overlays (popover/modal/tooltip), toaster
    fields/       status/priority/assignee/tag/date pickers
    views/        the 8 project views + shared toolbar
    task/         task detail slide-over
    layout/       sidebar, topbar, command palette, notifications
    modals/       create task/project/space, project settings
  app/            landing + /app/* routes (App Router, client components)
```

The data layer is a single persisted store with an action API that mirrors a REST backend (create/update/delete per entity; side effects like activity logging, notifications and automation runs handled centrally) — swapping in a real API later means reimplementing `store.ts` actions against a server without touching the UI.

— Live demo: https://anglestrategy.github.io/angle-aitools/
