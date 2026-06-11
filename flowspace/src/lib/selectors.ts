import type { ID, Priority, Project, Status, Task, ViewState } from "./types";
import { isDone, priorityMeta } from "./utils";
import { parseISO } from "date-fns";

// ─── Filtering / sorting / grouping shared across views ────────────────────

export function applyFilters(tasks: Task[], project: Project, vs: ViewState): Task[] {
  let out = tasks.filter((t) => t.projectId === project.id && !t.archived);
  if (!vs.showSubtasks) out = out.filter((t) => !t.parentId);
  if (!vs.showCompleted) out = out.filter((t) => !isDone(t, project.statuses));
  if (vs.filterAssignees.length)
    out = out.filter(
      (t) =>
        t.assigneeIds.some((a) => vs.filterAssignees.includes(a)) ||
        (vs.filterAssignees.includes("unassigned") && t.assigneeIds.length === 0)
    );
  if (vs.filterPriorities.length) out = out.filter((t) => vs.filterPriorities.includes(t.priority));
  if (vs.filterStatuses.length) out = out.filter((t) => vs.filterStatuses.includes(t.statusId));
  if (vs.filterTags.length) out = out.filter((t) => t.tagIds.some((tg) => vs.filterTags.includes(tg)));
  if (vs.search.trim()) {
    const q = vs.search.trim().toLowerCase();
    out = out.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }
  return out;
}

export function sortTasks(tasks: Task[], vs: ViewState): Task[] {
  const dir = vs.sortDir === "asc" ? 1 : -1;
  const sorted = [...tasks];
  switch (vs.sortBy) {
    case "manual":
      sorted.sort((a, b) => (a.order - b.order) * dir);
      break;
    case "dueDate":
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()) * dir;
      });
      break;
    case "priority":
      sorted.sort((a, b) => (priorityMeta[a.priority].rank - priorityMeta[b.priority].rank) * dir);
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title) * dir);
      break;
    case "createdAt":
      sorted.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1) * dir);
      break;
    case "updatedAt":
      sorted.sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1) * dir);
      break;
  }
  return sorted;
}

export interface TaskGroup {
  key: string;
  label: string;
  color: string;
  icon?: string;
  tasks: Task[];
  /** statusId when grouping by status — used for board drops & quick-create */
  statusId?: ID;
}

export function groupTasks(
  tasks: Task[],
  project: Project,
  vs: ViewState,
  users: { id: ID; name: string; color: string }[],
  tags: { id: ID; name: string; color: string }[]
): TaskGroup[] {
  const sorted = sortTasks(tasks, vs);
  switch (vs.groupBy) {
    case "status": {
      const ordered = [...project.statuses].sort((a, b) => a.order - b.order);
      return ordered.map((s) => ({
        key: `status:${s.id}`,
        label: s.name,
        color: s.color,
        statusId: s.id,
        tasks: sorted.filter((t) => t.statusId === s.id),
      }));
    }
    case "assignee": {
      const groups: TaskGroup[] = users
        .map((u) => ({
          key: `assignee:${u.id}`,
          label: u.name,
          color: u.color,
          tasks: sorted.filter((t) => t.assigneeIds.includes(u.id)),
        }))
        .filter((g) => g.tasks.length > 0);
      const unassigned = sorted.filter((t) => t.assigneeIds.length === 0);
      if (unassigned.length) groups.push({ key: "assignee:none", label: "Unassigned", color: "#64748b", tasks: unassigned });
      return groups;
    }
    case "priority": {
      const order: Priority[] = ["urgent", "high", "normal", "low", "none"];
      return order
        .map((p) => ({
          key: `priority:${p}`,
          label: priorityMeta[p].label,
          color: priorityMeta[p].color,
          icon: priorityMeta[p].icon,
          tasks: sorted.filter((t) => t.priority === p),
        }))
        .filter((g) => g.tasks.length > 0);
    }
    case "tag": {
      const groups: TaskGroup[] = tags
        .map((tg) => ({
          key: `tag:${tg.id}`,
          label: tg.name,
          color: tg.color,
          tasks: sorted.filter((t) => t.tagIds.includes(tg.id)),
        }))
        .filter((g) => g.tasks.length > 0);
      const untagged = sorted.filter((t) => t.tagIds.length === 0);
      if (untagged.length) groups.push({ key: "tag:none", label: "No tags", color: "#64748b", tasks: untagged });
      return groups;
    }
    case "dueDate": {
      const buckets: { key: string; label: string; color: string; test: (t: Task) => boolean }[] = [
        { key: "due:overdue", label: "Overdue", color: "#fb7185", test: (t) => !!t.dueDate && parseISO(t.dueDate) < startOfToday() && !t.completedAt },
        { key: "due:today", label: "Today", color: "#fbbf24", test: (t) => !!t.dueDate && sameDay(parseISO(t.dueDate), new Date()) },
        { key: "due:week", label: "This week", color: "#38bdf8", test: (t) => !!t.dueDate && withinDays(parseISO(t.dueDate), 7) },
        { key: "due:later", label: "Later", color: "#94a3b8", test: (t) => !!t.dueDate && !withinDays(parseISO(t.dueDate), 7) && parseISO(t.dueDate) >= startOfToday() },
        { key: "due:none", label: "No due date", color: "#64748b", test: (t) => !t.dueDate },
      ];
      const used = new Set<string>();
      return buckets
        .map((b) => ({
          key: b.key,
          label: b.label,
          color: b.color,
          tasks: sorted.filter((t) => {
            if (used.has(t.id)) return false;
            const ok = b.test(t);
            if (ok) used.add(t.id);
            return ok;
          }),
        }))
        .filter((g) => g.tasks.length > 0);
    }
    case "none":
    default:
      return [{ key: "all", label: "All tasks", color: "#94a3b8", tasks: sorted }];
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function withinDays(d: Date, days: number) {
  const today = startOfToday();
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return d >= today && d <= end;
}

// ─── Misc derived data ──────────────────────────────────────────────────────

export function taskProgress(task: Task, subtasks: Task[], statuses: Status[]): number {
  if (subtasks.length) {
    const done = subtasks.filter((s) => isDone(s, statuses)).length;
    return Math.round((done / subtasks.length) * 100);
  }
  if (task.checklist.length) {
    const done = task.checklist.filter((c) => c.done).length;
    return Math.round((done / task.checklist.length) * 100);
  }
  return task.completedAt ? 100 : 0;
}

export function projectProgress(tasks: Task[], project: Project): number {
  const top = tasks.filter((t) => t.projectId === project.id && !t.parentId && !t.archived);
  if (!top.length) return 0;
  const done = top.filter((t) => isDone(t, project.statuses)).length;
  return Math.round((done / top.length) * 100);
}
