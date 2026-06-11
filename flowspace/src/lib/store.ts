"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { addDays, differenceInMinutes, format } from "date-fns";
import type {
  Activity,
  ActivityType,
  AppNotification,
  Automation,
  Comment,
  CustomFieldDef,
  Dashboard,
  Doc,
  Goal,
  ID,
  Integration,
  NotificationType,
  Priority,
  Project,
  RunningTimer,
  Space,
  Status,
  Tag,
  Task,
  TimeEntry,
  User,
  ViewState,
  Widget,
  Workspace,
} from "./types";
import { defaultViewState as dvs } from "./types";
import {
  seedActivities,
  seedAutomations,
  seedComments,
  seedDashboards,
  seedDocs,
  seedGoals,
  seedIntegrations,
  seedNotifications,
  seedProjects,
  seedSpaces,
  seedTags,
  seedTasks,
  seedTimeEntries,
  seedUsers,
  seedWorkspace,
} from "./seed";
import { isDone, nowIso, priorityMeta, todayStr, uid } from "./utils";

// ─── Automation event plumbing ──────────────────────────────────────────────

interface AutomationEvent {
  type:
    | "status_changed"
    | "task_created"
    | "priority_changed"
    | "assignee_added"
    | "tag_added"
    | "task_completed";
  taskId: ID;
  /** event payload, e.g. new statusId / priority / userId / tagId */
  value?: string;
}

// ─── Store shape ────────────────────────────────────────────────────────────

export interface DataState {
  hydrated: boolean;
  currentUserId: ID | null;
  workspace: Workspace;
  users: User[];
  spaces: Space[];
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
  comments: Comment[];
  activities: Activity[];
  notifications: AppNotification[];
  timeEntries: TimeEntry[];
  runningTimer: RunningTimer | null;
  docs: Doc[];
  goals: Goal[];
  automations: Automation[];
  dashboards: Dashboard[];
  integrations: Integration[];
  favorites: { projects: ID[]; docs: ID[]; dashboards: ID[] };
  recentProjectIds: ID[];
  viewStates: Record<string, ViewState>;
  notifiedDueIds: ID[];

  // auth
  login: (userId: ID) => void;
  logout: () => void;

  // workspace
  updateWorkspace: (patch: Partial<Workspace>) => void;

  // spaces
  createSpace: (data: Pick<Space, "name" | "icon" | "color" | "description" | "private">) => ID;
  updateSpace: (id: ID, patch: Partial<Space>) => void;
  deleteSpace: (id: ID) => void;

  // projects
  createProject: (data: { spaceId: ID; name: string; icon: string; color: string; description?: string; template?: "dev" | "simple" | "campaign" }) => ID;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;
  addStatus: (projectId: ID, name: string, color: string, kind: Status["kind"]) => void;
  updateStatus: (projectId: ID, statusId: ID, patch: Partial<Status>) => void;
  deleteStatus: (projectId: ID, statusId: ID) => void;
  addCustomField: (projectId: ID, field: Omit<CustomFieldDef, "id">) => void;
  updateCustomField: (projectId: ID, fieldId: ID, patch: Partial<CustomFieldDef>) => void;
  deleteCustomField: (projectId: ID, fieldId: ID) => void;
  touchRecentProject: (id: ID) => void;

  // tasks
  createTask: (data: Partial<Task> & { projectId: ID; title: string }) => ID;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  deleteTask: (id: ID) => void;
  duplicateTask: (id: ID) => ID | null;
  moveTaskToStatus: (id: ID, statusId: ID, order?: number) => void;
  moveTaskToProject: (id: ID, projectId: ID) => void;
  toggleTaskComplete: (id: ID) => void;
  setTaskOrder: (id: ID, order: number) => void;
  addChecklistItem: (taskId: ID, text: string) => void;
  toggleChecklistItem: (taskId: ID, itemId: ID) => void;
  deleteChecklistItem: (taskId: ID, itemId: ID) => void;
  addAttachment: (taskId: ID, name: string, sizeKb: number, type: Task["attachments"][number]["type"]) => void;
  deleteAttachment: (taskId: ID, attachmentId: ID) => void;

  // tags
  createTag: (name: string, color: string) => ID;
  deleteTag: (id: ID) => void;

  // comments
  addComment: (taskId: ID, body: string) => void;
  deleteComment: (id: ID) => void;
  toggleReaction: (commentId: ID, emoji: string) => void;
  toggleResolveComment: (id: ID) => void;

  // time
  addTimeEntry: (taskId: ID, durationMins: number, note: string, date?: string, billable?: boolean) => void;
  deleteTimeEntry: (id: ID) => void;
  startTimer: (taskId: ID) => void;
  stopTimer: (note?: string) => void;

  // docs
  createDoc: (data?: Partial<Doc>) => ID;
  updateDoc: (id: ID, patch: Partial<Doc>) => void;
  deleteDoc: (id: ID) => void;

  // goals
  createGoal: (data: Pick<Goal, "name" | "description" | "ownerId" | "dueDate" | "color">) => ID;
  updateGoal: (id: ID, patch: Partial<Goal>) => void;
  deleteGoal: (id: ID) => void;
  addKeyResult: (goalId: ID, kr: Omit<Goal["keyResults"][number], "id">) => void;
  updateKeyResult: (goalId: ID, krId: ID, patch: Partial<Goal["keyResults"][number]>) => void;
  deleteKeyResult: (goalId: ID, krId: ID) => void;

  // automations
  createAutomation: (data: Omit<Automation, "id" | "runs" | "lastRunAt" | "createdAt">) => ID;
  updateAutomation: (id: ID, patch: Partial<Automation>) => void;
  deleteAutomation: (id: ID) => void;

  // dashboards
  createDashboard: (name: string, icon: string) => ID;
  updateDashboard: (id: ID, patch: Partial<Dashboard>) => void;
  deleteDashboard: (id: ID) => void;
  addWidget: (dashboardId: ID, widget: Omit<Widget, "id">) => void;
  removeWidget: (dashboardId: ID, widgetId: ID) => void;

  // notifications
  markNotificationRead: (id: ID, read?: boolean) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // integrations
  toggleIntegration: (id: ID) => void;

  // users
  inviteUser: (name: string, email: string, role: User["role"], title: string) => void;
  updateUser: (id: ID, patch: Partial<User>) => void;
  removeUser: (id: ID) => void;

  // favorites & view state
  toggleFavorite: (kind: "projects" | "docs" | "dashboards", id: ID) => void;
  setViewState: (key: string, patch: Partial<ViewState>) => void;
  resetViewState: (key: string) => void;

  // lifecycle
  checkDueTasks: () => void;
  resetDemoData: () => void;
}

// helpers operating inside immer drafts ---------------------------------------

type Draft = DataState;

function logActivity(
  d: Draft,
  entityType: Activity["entityType"],
  entityId: ID,
  type: ActivityType,
  meta: Record<string, string> = {},
  actorId?: ID | "automation"
) {
  d.activities.unshift({
    id: uid("a"),
    entityType,
    entityId,
    actorId: actorId ?? d.currentUserId ?? "u_ava",
    type,
    meta,
    createdAt: nowIso(),
  });
  if (d.activities.length > 600) d.activities.length = 600;
}

function pushNotification(
  d: Draft,
  userId: ID,
  type: NotificationType,
  title: string,
  body: string,
  taskId: ID | null,
  actorId: ID | "automation" | null
) {
  if (userId === actorId) return;
  const task = taskId ? d.tasks.find((t) => t.id === taskId) : null;
  d.notifications.unshift({
    id: uid("n"),
    userId,
    type,
    title,
    body,
    taskId,
    projectId: task?.projectId ?? null,
    actorId,
    read: false,
    createdAt: nowIso(),
  });
  if (d.notifications.length > 300) d.notifications.length = 300;
}

function notifyWatchers(
  d: Draft,
  task: Task,
  type: NotificationType,
  title: string,
  body: string,
  actorId: ID | "automation"
) {
  const targets = new Set([...task.watcherIds, ...task.assigneeIds]);
  targets.forEach((u) => {
    if (u !== actorId) pushNotification(d, u, type, title, body, task.id, actorId);
  });
}

// ─── Automation engine ──────────────────────────────────────────────────────

function conditionsPass(d: Draft, auto: Automation, task: Task): boolean {
  return auto.conditions.every((c) => {
    let actual: string[] = [];
    if (c.field === "priority") actual = [task.priority];
    else if (c.field === "status") actual = [task.statusId];
    else if (c.field === "assignee") actual = task.assigneeIds;
    else if (c.field === "tag") actual = task.tagIds;
    const has = actual.includes(c.value);
    return c.operator === "is" ? has : !has;
  });
}

function runAutomations(d: Draft, event: AutomationEvent, depth = 0) {
  if (depth > 1) return; // prevent cascading loops
  const task = d.tasks.find((t) => t.id === event.taskId);
  if (!task) return;

  const matched = d.automations.filter((a) => {
    if (!a.enabled) return false;
    if (a.projectId && a.projectId !== task.projectId) return false;
    if (a.trigger.type !== event.type) {
      // task_completed is also fired through status_changed; handled separately
      return false;
    }
    const cfg = a.trigger.config;
    if (event.type === "status_changed" && cfg.statusId && cfg.statusId !== event.value) return false;
    if (event.type === "priority_changed" && cfg.priority && cfg.priority !== event.value) return false;
    if (event.type === "tag_added" && cfg.tagId && cfg.tagId !== event.value) return false;
    if (event.type === "assignee_added" && cfg.userId && cfg.userId !== event.value) return false;
    return true;
  });

  for (const auto of matched) {
    if (!conditionsPass(d, auto, task)) continue;
    auto.runs += 1;
    auto.lastRunAt = nowIso();
    const actionsTaken: string[] = [];

    for (const action of auto.actions) {
      const cfg = action.config;
      switch (action.type) {
        case "set_status": {
          const project = d.projects.find((p) => p.id === task.projectId);
          const st = project?.statuses.find((s) => s.id === cfg.statusId);
          if (st && task.statusId !== st.id) {
            task.statusId = st.id;
            if (st.kind === "done" || st.kind === "closed") task.completedAt = nowIso();
            actionsTaken.push(`status → ${st.name}`);
          }
          break;
        }
        case "set_priority": {
          if (cfg.priority && task.priority !== cfg.priority) {
            task.priority = cfg.priority as Priority;
            actionsTaken.push(`priority → ${priorityMeta[task.priority].label}`);
          }
          break;
        }
        case "assign_user": {
          if (cfg.userId && !task.assigneeIds.includes(cfg.userId)) {
            task.assigneeIds.push(cfg.userId);
            const u = d.users.find((x) => x.id === cfg.userId);
            actionsTaken.push(`assigned ${u?.name ?? "user"}`);
            pushNotification(d, cfg.userId, "assigned", "Assigned by automation", `"${auto.name}" assigned you to: ${task.title}`, task.id, "automation");
          }
          break;
        }
        case "add_tag": {
          if (cfg.tagId && !task.tagIds.includes(cfg.tagId)) {
            task.tagIds.push(cfg.tagId);
            const tg = d.tags.find((x) => x.id === cfg.tagId);
            actionsTaken.push(`tagged ${tg?.name ?? "tag"}`);
          }
          break;
        }
        case "set_due_date_relative": {
          const days = parseInt(cfg.days ?? "1", 10);
          task.dueDate = format(addDays(new Date(), days), "yyyy-MM-dd");
          actionsTaken.push(`due date → +${days}d`);
          break;
        }
        case "post_comment": {
          d.comments.push({
            id: uid("c"),
            taskId: task.id,
            authorId: "u_ava", // rendered as Automation via flag below
            body: cfg.body ?? "Automation ran.",
            createdAt: nowIso(),
            reactions: [],
            resolved: false,
          });
          // mark comment as automation-authored via body prefix convention
          d.comments[d.comments.length - 1].authorId = "automation" as ID;
          actionsTaken.push("posted comment");
          break;
        }
        case "notify_user": {
          if (cfg.userId) {
            pushNotification(d, cfg.userId, "automation", `Automation: ${auto.name}`, `Ran on: ${task.title}`, task.id, "automation");
            actionsTaken.push("sent notification");
          }
          break;
        }
        case "move_to_project": {
          if (cfg.projectId && cfg.projectId !== task.projectId) {
            const target = d.projects.find((p) => p.id === cfg.projectId);
            if (target) {
              task.projectId = target.id;
              const match = target.statuses.find((s) => s.id === task.statusId) ?? target.statuses[0];
              task.statusId = match.id;
              actionsTaken.push(`moved to ${target.name}`);
            }
          }
          break;
        }
        case "create_subtask": {
          const project = d.projects.find((p) => p.id === task.projectId);
          if (project) {
            d.tasks.push({
              id: uid("t"),
              projectId: task.projectId,
              parentId: task.id,
              title: cfg.title ?? "Follow-up",
              description: "",
              statusId: project.statuses[0].id,
              priority: "none",
              assigneeIds: [],
              watcherIds: [],
              tagIds: [],
              startDate: null,
              dueDate: null,
              estimateHours: null,
              storyPoints: null,
              customFieldValues: {},
              checklist: [],
              attachments: [],
              order: Date.now(),
              createdAt: nowIso(),
              updatedAt: nowIso(),
              createdBy: "u_ava",
              completedAt: null,
              coverGradient: null,
              archived: false,
            });
            actionsTaken.push("created subtask");
          }
          break;
        }
        case "archive_task": {
          task.archived = true;
          actionsTaken.push("archived task");
          break;
        }
      }
    }

    if (actionsTaken.length) {
      task.updatedAt = nowIso();
      logActivity(d, "task", task.id, "automation_run", { name: auto.name, actions: actionsTaken.join(", ") }, "automation");
    }
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

const initialData = () => ({
  hydrated: false,
  currentUserId: null as ID | null,
  workspace: seedWorkspace,
  users: seedUsers,
  spaces: seedSpaces,
  projects: seedProjects,
  tasks: seedTasks,
  tags: seedTags,
  comments: seedComments,
  activities: seedActivities,
  notifications: seedNotifications,
  timeEntries: seedTimeEntries,
  runningTimer: null as RunningTimer | null,
  docs: seedDocs,
  goals: seedGoals,
  automations: seedAutomations,
  dashboards: seedDashboards,
  integrations: seedIntegrations,
  favorites: { projects: ["pr_app", "pr_q3"], docs: ["doc_v4_prd"], dashboards: ["dash_exec"] },
  recentProjectIds: ["pr_app", "pr_bugs", "pr_q3"],
  viewStates: {} as Record<string, ViewState>,
  notifiedDueIds: [] as ID[],
});

export const useStore = create<DataState>()(
  persist(
    immer((set, get) => ({
      ...initialData(),

      // ── auth ──
      login: (userId) =>
        set((d) => {
          d.currentUserId = userId;
        }),
      logout: () =>
        set((d) => {
          d.currentUserId = null;
        }),

      updateWorkspace: (patch) =>
        set((d) => {
          Object.assign(d.workspace, patch);
        }),

      // ── spaces ──
      createSpace: (data) => {
        const id = uid("sp");
        set((d) => {
          d.spaces.push({ id, archived: false, memberIds: d.currentUserId ? [d.currentUserId] : [], order: d.spaces.length, ...data });
        });
        return id;
      },
      updateSpace: (id, patch) =>
        set((d) => {
          const s = d.spaces.find((x) => x.id === id);
          if (s) Object.assign(s, patch);
        }),
      deleteSpace: (id) =>
        set((d) => {
          const projectIds = d.projects.filter((p) => p.spaceId === id).map((p) => p.id);
          d.spaces = d.spaces.filter((x) => x.id !== id);
          d.projects = d.projects.filter((p) => p.spaceId !== id);
          d.tasks = d.tasks.filter((t) => !projectIds.includes(t.projectId));
          d.docs = d.docs.map((doc) => (doc.spaceId === id ? { ...doc, spaceId: null } : doc));
        }),

      // ── projects ──
      createProject: ({ spaceId, name, icon, color, description = "", template = "simple" }) => {
        const id = uid("pr");
        set((d) => {
          const statuses: Status[] =
            template === "dev"
              ? [
                  { id: uid("st"), name: "Backlog", color: "#64748b", kind: "open", order: 0 },
                  { id: uid("st"), name: "To Do", color: "#94a3b8", kind: "open", order: 1 },
                  { id: uid("st"), name: "In Progress", color: "#38bdf8", kind: "active", order: 2 },
                  { id: uid("st"), name: "In Review", color: "#a855f7", kind: "active", order: 3 },
                  { id: uid("st"), name: "Done", color: "#34d399", kind: "done", order: 4 },
                ]
              : template === "campaign"
                ? [
                    { id: uid("st"), name: "Idea", color: "#94a3b8", kind: "open", order: 0 },
                    { id: uid("st"), name: "Drafting", color: "#fbbf24", kind: "active", order: 1 },
                    { id: uid("st"), name: "In Review", color: "#a855f7", kind: "active", order: 2 },
                    { id: uid("st"), name: "Live", color: "#34d399", kind: "done", order: 3 },
                  ]
                : [
                    { id: uid("st"), name: "To Do", color: "#94a3b8", kind: "open", order: 0 },
                    { id: uid("st"), name: "In Progress", color: "#38bdf8", kind: "active", order: 1 },
                    { id: uid("st"), name: "Done", color: "#34d399", kind: "done", order: 2 },
                  ];
          d.projects.push({
            id,
            spaceId,
            name,
            icon,
            color,
            description,
            statuses,
            customFields: [],
            views: ["overview", "list", "board", "table", "calendar", "gantt", "workload", "activity"],
            defaultView: "list",
            memberIds: d.currentUserId ? [d.currentUserId] : [],
            archived: false,
            order: d.projects.filter((p) => p.spaceId === spaceId).length,
            createdAt: nowIso(),
            startDate: null,
            targetDate: null,
          });
          logActivity(d, "project", id, "created");
        });
        return id;
      },
      updateProject: (id, patch) =>
        set((d) => {
          const p = d.projects.find((x) => x.id === id);
          if (p) Object.assign(p, patch);
        }),
      deleteProject: (id) =>
        set((d) => {
          d.projects = d.projects.filter((x) => x.id !== id);
          d.tasks = d.tasks.filter((t) => t.projectId !== id);
          d.automations = d.automations.filter((a) => a.projectId !== id);
          d.favorites.projects = d.favorites.projects.filter((x) => x !== id);
          d.recentProjectIds = d.recentProjectIds.filter((x) => x !== id);
        }),
      addStatus: (projectId, name, color, kind) =>
        set((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (p) p.statuses.push({ id: uid("st"), name, color, kind, order: p.statuses.length });
        }),
      updateStatus: (projectId, statusId, patch) =>
        set((d) => {
          const st = d.projects.find((x) => x.id === projectId)?.statuses.find((s) => s.id === statusId);
          if (st) Object.assign(st, patch);
        }),
      deleteStatus: (projectId, statusId) =>
        set((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (!p || p.statuses.length <= 1) return;
          const fallback = p.statuses.find((s) => s.id !== statusId)!;
          p.statuses = p.statuses.filter((s) => s.id !== statusId);
          d.tasks.forEach((t) => {
            if (t.projectId === projectId && t.statusId === statusId) t.statusId = fallback.id;
          });
        }),
      addCustomField: (projectId, field) =>
        set((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (p) p.customFields.push({ id: uid("cf"), ...field });
        }),
      updateCustomField: (projectId, fieldId, patch) =>
        set((d) => {
          const f = d.projects.find((x) => x.id === projectId)?.customFields.find((c) => c.id === fieldId);
          if (f) Object.assign(f, patch);
        }),
      deleteCustomField: (projectId, fieldId) =>
        set((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (p) p.customFields = p.customFields.filter((c) => c.id !== fieldId);
        }),
      touchRecentProject: (id) =>
        set((d) => {
          d.recentProjectIds = [id, ...d.recentProjectIds.filter((x) => x !== id)].slice(0, 8);
        }),

      // ── tasks ──
      createTask: (data) => {
        const id = uid("t");
        set((d) => {
          const project = d.projects.find((p) => p.id === data.projectId);
          if (!project) return;
          const me = d.currentUserId ?? "u_ava";
          const task: Task = {
            id,
            projectId: data.projectId,
            parentId: data.parentId ?? null,
            title: data.title,
            description: data.description ?? "",
            statusId: data.statusId ?? project.statuses[0].id,
            priority: data.priority ?? "none",
            assigneeIds: data.assigneeIds ?? [],
            watcherIds: data.watcherIds ?? [me],
            tagIds: data.tagIds ?? [],
            startDate: data.startDate ?? null,
            dueDate: data.dueDate ?? null,
            estimateHours: data.estimateHours ?? null,
            storyPoints: data.storyPoints ?? null,
            customFieldValues: data.customFieldValues ?? {},
            checklist: data.checklist ?? [],
            attachments: [],
            order: data.order ?? Date.now(),
            createdAt: nowIso(),
            updatedAt: nowIso(),
            createdBy: me,
            completedAt: null,
            coverGradient: data.coverGradient ?? null,
            archived: false,
          };
          d.tasks.push(task);
          logActivity(d, "task", id, "created");
          task.assigneeIds.forEach((u) =>
            pushNotification(d, u, "assigned", "You were assigned a task", task.title, id, me)
          );
          if (task.parentId) logActivity(d, "task", task.parentId, "subtask_added", { title: task.title });
          runAutomations(d, { type: "task_created", taskId: id });
        });
        return id;
      },

      updateTask: (id, patch) =>
        set((d) => {
          const task = d.tasks.find((t) => t.id === id);
          if (!task) return;
          const me = d.currentUserId ?? "u_ava";
          const project = d.projects.find((p) => p.id === task.projectId);
          const events: AutomationEvent[] = [];

          if (patch.title !== undefined && patch.title !== task.title) {
            logActivity(d, "task", id, "renamed", { from: task.title, to: patch.title });
          }
          if (patch.statusId !== undefined && patch.statusId !== task.statusId) {
            const from = project?.statuses.find((s) => s.id === task.statusId)?.name ?? "";
            const toStatus = project?.statuses.find((s) => s.id === patch.statusId);
            logActivity(d, "task", id, "status_changed", { from, to: toStatus?.name ?? "" });
            notifyWatchers(d, task, "status_change", `Task moved to ${toStatus?.name}`, task.title, me);
            events.push({ type: "status_changed", taskId: id, value: patch.statusId });
            if (toStatus && (toStatus.kind === "done" || toStatus.kind === "closed")) {
              patch.completedAt = nowIso();
              logActivity(d, "task", id, "completed");
              events.push({ type: "task_completed", taskId: id });
            } else if (task.completedAt) {
              patch.completedAt = null;
              logActivity(d, "task", id, "reopened");
            }
          }
          if (patch.priority !== undefined && patch.priority !== task.priority) {
            logActivity(d, "task", id, "priority_changed", {
              from: priorityMeta[task.priority].label,
              to: priorityMeta[patch.priority].label,
            });
            events.push({ type: "priority_changed", taskId: id, value: patch.priority });
          }
          if (patch.assigneeIds !== undefined) {
            const added = patch.assigneeIds.filter((u) => !task.assigneeIds.includes(u));
            const removed = task.assigneeIds.filter((u) => !patch.assigneeIds!.includes(u));
            added.forEach((u) => {
              const user = d.users.find((x) => x.id === u);
              logActivity(d, "task", id, "assigned", { user: user?.name ?? "" });
              pushNotification(d, u, "assigned", "You were assigned a task", task.title, id, me);
              events.push({ type: "assignee_added", taskId: id, value: u });
            });
            removed.forEach((u) => {
              const user = d.users.find((x) => x.id === u);
              logActivity(d, "task", id, "unassigned", { user: user?.name ?? "" });
            });
          }
          if (patch.dueDate !== undefined && patch.dueDate !== task.dueDate) {
            logActivity(d, "task", id, "due_date_changed", { to: patch.dueDate ?? "none" });
          }
          if (patch.tagIds !== undefined) {
            const added = patch.tagIds.filter((t) => !task.tagIds.includes(t));
            added.forEach((tg) => {
              const tag = d.tags.find((x) => x.id === tg);
              logActivity(d, "task", id, "tag_added", { tag: tag?.name ?? "" });
              events.push({ type: "tag_added", taskId: id, value: tg });
            });
          }

          Object.assign(task, patch, { updatedAt: nowIso() });
          events.forEach((e) => runAutomations(d, e));
        }),

      deleteTask: (id) =>
        set((d) => {
          const ids = new Set([id, ...d.tasks.filter((t) => t.parentId === id).map((t) => t.id)]);
          d.tasks = d.tasks.filter((t) => !ids.has(t.id));
          d.comments = d.comments.filter((c) => !ids.has(c.taskId));
          d.timeEntries = d.timeEntries.filter((te) => !ids.has(te.taskId));
          if (d.runningTimer && ids.has(d.runningTimer.taskId)) d.runningTimer = null;
        }),

      duplicateTask: (id) => {
        let newId: ID | null = null;
        set((d) => {
          const t = d.tasks.find((x) => x.id === id);
          if (!t) return;
          newId = uid("t");
          d.tasks.push({
            ...JSON.parse(JSON.stringify(t)),
            id: newId,
            title: `${t.title} (copy)`,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            completedAt: null,
            order: t.order + 1,
          });
          logActivity(d, "task", newId, "created");
        });
        return newId;
      },

      moveTaskToStatus: (id, statusId, order) => {
        get().updateTask(id, { statusId, ...(order !== undefined ? { order } : {}) });
      },

      moveTaskToProject: (id, projectId) =>
        set((d) => {
          const task = d.tasks.find((t) => t.id === id);
          const target = d.projects.find((p) => p.id === projectId);
          if (!task || !target || task.projectId === projectId) return;
          const from = d.projects.find((p) => p.id === task.projectId);
          task.projectId = projectId;
          task.statusId = target.statuses[0].id;
          task.updatedAt = nowIso();
          d.tasks.forEach((sub) => {
            if (sub.parentId === id) {
              sub.projectId = projectId;
              sub.statusId = target.statuses[0].id;
            }
          });
          logActivity(d, "task", id, "moved", { from: from?.name ?? "", to: target.name });
        }),

      toggleTaskComplete: (id) => {
        const d = get();
        const task = d.tasks.find((t) => t.id === id);
        const project = d.projects.find((p) => p.id === task?.projectId);
        if (!task || !project) return;
        const done = isDone(task, project.statuses);
        const target = done
          ? project.statuses.find((s) => s.kind === "open") ?? project.statuses[0]
          : project.statuses.find((s) => s.kind === "done") ?? project.statuses[project.statuses.length - 1];
        d.updateTask(id, { statusId: target.id });
      },

      setTaskOrder: (id, order) =>
        set((d) => {
          const t = d.tasks.find((x) => x.id === id);
          if (t) {
            t.order = order;
            t.updatedAt = nowIso();
          }
        }),

      addChecklistItem: (taskId, text) =>
        set((d) => {
          const t = d.tasks.find((x) => x.id === taskId);
          if (t) {
            t.checklist.push({ id: uid("cl"), text, done: false });
            t.updatedAt = nowIso();
          }
        }),
      toggleChecklistItem: (taskId, itemId) =>
        set((d) => {
          const item = d.tasks.find((x) => x.id === taskId)?.checklist.find((c) => c.id === itemId);
          if (item) {
            item.done = !item.done;
            if (item.done) logActivity(d, "task", taskId, "checklist_updated", { item: item.text });
          }
        }),
      deleteChecklistItem: (taskId, itemId) =>
        set((d) => {
          const t = d.tasks.find((x) => x.id === taskId);
          if (t) t.checklist = t.checklist.filter((c) => c.id !== itemId);
        }),

      addAttachment: (taskId, name, sizeKb, type) =>
        set((d) => {
          const t = d.tasks.find((x) => x.id === taskId);
          if (t) {
            t.attachments.push({ id: uid("att"), name, sizeKb, type, uploadedBy: d.currentUserId ?? "u_ava", uploadedAt: nowIso() });
            logActivity(d, "task", taskId, "attachment_added", { name });
          }
        }),
      deleteAttachment: (taskId, attachmentId) =>
        set((d) => {
          const t = d.tasks.find((x) => x.id === taskId);
          if (t) t.attachments = t.attachments.filter((a) => a.id !== attachmentId);
        }),

      // ── tags ──
      createTag: (name, color) => {
        const id = uid("tag");
        set((d) => {
          d.tags.push({ id, name, color });
        });
        return id;
      },
      deleteTag: (id) =>
        set((d) => {
          d.tags = d.tags.filter((t) => t.id !== id);
          d.tasks.forEach((t) => {
            t.tagIds = t.tagIds.filter((x) => x !== id);
          });
        }),

      // ── comments ──
      addComment: (taskId, body) =>
        set((d) => {
          const me = d.currentUserId ?? "u_ava";
          d.comments.push({ id: uid("c"), taskId, authorId: me, body, createdAt: nowIso(), reactions: [], resolved: false });
          const task = d.tasks.find((t) => t.id === taskId);
          if (task) {
            logActivity(d, "task", taskId, "commented");
            const meUser = d.users.find((u) => u.id === me);
            notifyWatchers(d, task, "comment", `${meUser?.name ?? "Someone"} commented`, body.slice(0, 140), me);
            // mention detection
            d.users.forEach((u) => {
              if (u.id !== me && body.includes(`@${u.name}`)) {
                pushNotification(d, u.id, "mention", `${meUser?.name} mentioned you`, body.slice(0, 140), taskId, me);
              }
            });
            task.updatedAt = nowIso();
          }
        }),
      deleteComment: (id) =>
        set((d) => {
          d.comments = d.comments.filter((c) => c.id !== id);
        }),
      toggleReaction: (commentId, emoji) =>
        set((d) => {
          const c = d.comments.find((x) => x.id === commentId);
          if (!c) return;
          const me = d.currentUserId ?? "u_ava";
          let r = c.reactions.find((x) => x.emoji === emoji);
          if (!r) {
            r = { emoji, userIds: [] };
            c.reactions.push(r);
          }
          if (r.userIds.includes(me)) {
            r.userIds = r.userIds.filter((u) => u !== me);
            if (!r.userIds.length) c.reactions = c.reactions.filter((x) => x.emoji !== emoji);
          } else {
            r.userIds.push(me);
          }
        }),
      toggleResolveComment: (id) =>
        set((d) => {
          const c = d.comments.find((x) => x.id === id);
          if (c) c.resolved = !c.resolved;
        }),

      // ── time ──
      addTimeEntry: (taskId, durationMins, note, date, billable = true) =>
        set((d) => {
          d.timeEntries.push({ id: uid("te"), taskId, userId: d.currentUserId ?? "u_ava", date: date ?? todayStr(), durationMins, note, billable });
          logActivity(d, "task", taskId, "time_logged", { mins: String(durationMins) });
        }),
      deleteTimeEntry: (id) =>
        set((d) => {
          d.timeEntries = d.timeEntries.filter((t) => t.id !== id);
        }),
      startTimer: (taskId) =>
        set((d) => {
          d.runningTimer = { taskId, userId: d.currentUserId ?? "u_ava", startedAt: nowIso() };
        }),
      stopTimer: (note = "Tracked time") =>
        set((d) => {
          if (!d.runningTimer) return;
          const mins = Math.max(1, differenceInMinutes(new Date(), new Date(d.runningTimer.startedAt)));
          d.timeEntries.push({ id: uid("te"), taskId: d.runningTimer.taskId, userId: d.runningTimer.userId, date: todayStr(), durationMins: mins, note, billable: true });
          logActivity(d, "task", d.runningTimer.taskId, "time_logged", { mins: String(mins) });
          d.runningTimer = null;
        }),

      // ── docs ──
      createDoc: (data) => {
        const id = uid("doc");
        set((d) => {
          d.docs.push({
            id,
            spaceId: data?.spaceId ?? null,
            title: data?.title ?? "Untitled doc",
            icon: data?.icon ?? "mingcute:document-2-line",
            coverGradient: data?.coverGradient ?? null,
            content: data?.content ?? "",
            createdBy: d.currentUserId ?? "u_ava",
            createdAt: nowIso(),
            updatedAt: nowIso(),
          });
        });
        return id;
      },
      updateDoc: (id, patch) =>
        set((d) => {
          const doc = d.docs.find((x) => x.id === id);
          if (doc) Object.assign(doc, patch, { updatedAt: nowIso() });
        }),
      deleteDoc: (id) =>
        set((d) => {
          d.docs = d.docs.filter((x) => x.id !== id);
          d.favorites.docs = d.favorites.docs.filter((x) => x !== id);
        }),

      // ── goals ──
      createGoal: (data) => {
        const id = uid("g");
        set((d) => {
          d.goals.push({ id, status: "on_track", keyResults: [], createdAt: nowIso(), ...data });
        });
        return id;
      },
      updateGoal: (id, patch) =>
        set((d) => {
          const g = d.goals.find((x) => x.id === id);
          if (g) Object.assign(g, patch);
        }),
      deleteGoal: (id) =>
        set((d) => {
          d.goals = d.goals.filter((x) => x.id !== id);
        }),
      addKeyResult: (goalId, kr) =>
        set((d) => {
          d.goals.find((x) => x.id === goalId)?.keyResults.push({ id: uid("kr"), ...kr });
        }),
      updateKeyResult: (goalId, krId, patch) =>
        set((d) => {
          const kr = d.goals.find((x) => x.id === goalId)?.keyResults.find((k) => k.id === krId);
          if (kr) Object.assign(kr, patch);
        }),
      deleteKeyResult: (goalId, krId) =>
        set((d) => {
          const g = d.goals.find((x) => x.id === goalId);
          if (g) g.keyResults = g.keyResults.filter((k) => k.id !== krId);
        }),

      // ── automations ──
      createAutomation: (data) => {
        const id = uid("auto");
        set((d) => {
          d.automations.push({ id, runs: 0, lastRunAt: null, createdAt: nowIso(), ...data });
        });
        return id;
      },
      updateAutomation: (id, patch) =>
        set((d) => {
          const a = d.automations.find((x) => x.id === id);
          if (a) Object.assign(a, patch);
        }),
      deleteAutomation: (id) =>
        set((d) => {
          d.automations = d.automations.filter((x) => x.id !== id);
        }),

      // ── dashboards ──
      createDashboard: (name, icon) => {
        const id = uid("dash");
        set((d) => {
          d.dashboards.push({ id, name, icon, widgets: [], createdBy: d.currentUserId ?? "u_ava", createdAt: nowIso() });
        });
        return id;
      },
      updateDashboard: (id, patch) =>
        set((d) => {
          const dash = d.dashboards.find((x) => x.id === id);
          if (dash) Object.assign(dash, patch);
        }),
      deleteDashboard: (id) =>
        set((d) => {
          d.dashboards = d.dashboards.filter((x) => x.id !== id);
          d.favorites.dashboards = d.favorites.dashboards.filter((x) => x !== id);
        }),
      addWidget: (dashboardId, widget) =>
        set((d) => {
          d.dashboards.find((x) => x.id === dashboardId)?.widgets.push({ id: uid("w"), ...widget });
        }),
      removeWidget: (dashboardId, widgetId) =>
        set((d) => {
          const dash = d.dashboards.find((x) => x.id === dashboardId);
          if (dash) dash.widgets = dash.widgets.filter((w) => w.id !== widgetId);
        }),

      // ── notifications ──
      markNotificationRead: (id, read = true) =>
        set((d) => {
          const n = d.notifications.find((x) => x.id === id);
          if (n) n.read = read;
        }),
      markAllNotificationsRead: () =>
        set((d) => {
          d.notifications.forEach((n) => {
            if (n.userId === d.currentUserId) n.read = true;
          });
        }),
      clearNotifications: () =>
        set((d) => {
          d.notifications = d.notifications.filter((n) => n.userId !== d.currentUserId);
        }),

      // ── integrations ──
      toggleIntegration: (id) =>
        set((d) => {
          const i = d.integrations.find((x) => x.id === id);
          if (i) i.connected = !i.connected;
        }),

      // ── users ──
      inviteUser: (name, email, role, title) =>
        set((d) => {
          const colors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7"];
          d.users.push({
            id: uid("u"),
            name,
            email,
            initials: name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
            color: colors[d.users.length % colors.length],
            role,
            title,
            online: false,
            capacityHours: 40,
          });
        }),
      updateUser: (id, patch) =>
        set((d) => {
          const u = d.users.find((x) => x.id === id);
          if (u) Object.assign(u, patch);
        }),
      removeUser: (id) =>
        set((d) => {
          d.users = d.users.filter((u) => u.id !== id);
          d.tasks.forEach((t) => {
            t.assigneeIds = t.assigneeIds.filter((x) => x !== id);
            t.watcherIds = t.watcherIds.filter((x) => x !== id);
          });
        }),

      // ── favorites & view state ──
      toggleFavorite: (kind, id) =>
        set((d) => {
          const list = d.favorites[kind];
          d.favorites[kind] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        }),
      setViewState: (key, patch) =>
        set((d) => {
          d.viewStates[key] = { ...(d.viewStates[key] ?? dvs), ...patch };
        }),
      resetViewState: (key) =>
        set((d) => {
          delete d.viewStates[key];
        }),

      // ── lifecycle ──
      checkDueTasks: () =>
        set((d) => {
          const me = d.currentUserId;
          if (!me) return;
          const today = todayStr();
          d.tasks.forEach((t) => {
            if (
              t.dueDate === today &&
              !t.completedAt &&
              !t.archived &&
              t.assigneeIds.includes(me) &&
              !d.notifiedDueIds.includes(t.id)
            ) {
              d.notifiedDueIds.push(t.id);
              pushNotification(d, me, "due_soon", "Due today", `${t.title} is due today`, t.id, null);
            }
          });
        }),

      resetDemoData: () =>
        set((d) => {
          const me = d.currentUserId;
          Object.assign(d, initialData(), { hydrated: true, currentUserId: me });
        }),
    })),
    {
      name: "flowspace-data-v1",
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

// mark hydrated immediately when there is no persisted state (first visit)
if (typeof window !== "undefined") {
  // persist calls onRehydrateStorage async; ensure flag flips even with empty storage
  setTimeout(() => {
    if (!useStore.getState().hydrated) useStore.setState({ hydrated: true });
  }, 0);
}
