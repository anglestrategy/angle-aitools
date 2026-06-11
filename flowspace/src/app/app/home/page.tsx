"use client";

import Link from "next/link";
import { motion } from "motion/react";
import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Activity, Goal, GoalStatus, Project, Task } from "@/lib/types";
import { projectProgress } from "@/lib/selectors";
import { cn, dueState, dueStateColor, formatDate, formatDuration, isDone, pluralize, timeAgo } from "@/lib/utils";
import { Avatar, AvatarStack, Badge, Checkbox, EmptyState, Icon, ProgressBar, SectionLabel } from "@/components/ui/primitives";
import { PriorityFlag } from "@/components/fields/pickers";

// ─── Meta ────────────────────────────────────────────────────────────────────

const goalStatusMeta: Record<GoalStatus, { label: string; color: string }> = {
  on_track: { label: "On track", color: "#34d399" },
  at_risk: { label: "At risk", color: "#fbbf24" },
  off_track: { label: "Off track", color: "#fb7185" },
  completed: { label: "Completed", color: "#818cf8" },
};

function goalProgress(g: Goal): number {
  if (!g.keyResults.length) return g.status === "completed" ? 100 : 0;
  const avg =
    g.keyResults.reduce((sum, kr) => sum + Math.min(1, kr.target > 0 ? kr.current / kr.target : 1), 0) /
    g.keyResults.length;
  return Math.round(avg * 100);
}

function activityPhrase(a: Activity): string {
  const m = a.meta;
  switch (a.type) {
    case "created": return "created";
    case "status_changed": return m.to ? `moved to ${m.to}:` : "changed the status of";
    case "priority_changed": return m.to ? `set priority to ${m.to} on` : "changed priority on";
    case "assigned": return m.user ? `assigned ${m.user} to` : "updated assignees on";
    case "unassigned": return m.user ? `removed ${m.user} from` : "updated assignees on";
    case "due_date_changed": return m.to && m.to !== "none" ? `set the due date to ${formatDate(m.to)} on` : "cleared the due date on";
    case "commented": return "commented on";
    case "tag_added": return m.tag ? `tagged "${m.tag}" on` : "added a tag to";
    case "tag_removed": return "removed a tag from";
    case "attachment_added": return m.name ? `attached ${m.name} to` : "added an attachment to";
    case "subtask_added": return "added a subtask to";
    case "subtask_completed": return "completed a subtask of";
    case "time_logged": return m.mins ? `logged ${formatDuration(Number(m.mins))} on` : "logged time on";
    case "moved": return m.to ? `moved to ${m.to}:` : "moved";
    case "completed": return "completed";
    case "reopened": return "reopened";
    case "automation_run": return m.name ? `ran "${m.name}" on` : "ran an automation on";
    case "field_changed": return "updated a field on";
    case "renamed": return m.to ? `renamed a task to "${m.to}"` : "renamed";
    case "checklist_updated": return "checked off an item on";
    case "dependency_added": return "added a dependency to";
    default: return "updated";
  }
}

const tabs = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Done" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

// ─── Building blocks ─────────────────────────────────────────────────────────

function SummaryChip({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="glass-soft flex items-center gap-2.5 rounded-xl px-3 py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f` }}>
        <Icon name={icon} size={15} style={{ color }} />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-bold text-white/95">{value}</div>
        <div className="text-[10px] text-white/40">{label}</div>
      </div>
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const spaces = useStore((s) => s.spaces);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const space = spaces.find((sp) => sp.id === project.spaceId);
  const members = users.filter((u) => project.memberIds.includes(u.id));
  const progress = projectProgress(tasks, project);
  const openCount = tasks.filter(
    (t) => t.projectId === project.id && !t.parentId && !t.archived && !isDone(t, project.statuses)
  ).length;
  const isFav = favorites.projects.includes(project.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.05 }}
    >
      <Link href={`/app/projects/${project.id}`} className="glass-card glass-hover sheen group relative block p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${project.color}22` }}>
            <Icon name={project.icon} size={19} style={{ color: project.color }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-white/92">{project.name}</div>
            <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/40">
              {space && <Icon name={space.icon} size={11} />}
              {space?.name ?? "Workspace"}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite("projects", project.id);
            }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer",
              isFav ? "text-amber-300" : "text-white/25 opacity-0 group-hover:opacity-100 hover:text-amber-300"
            )}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Icon name={isFav ? "mingcute:star-fill" : "mingcute:star-line"} size={15} />
          </button>
        </div>
        <div className="mt-3.5">
          <div className="mb-1 flex items-center justify-between text-[10px] text-white/40">
            <span>{pluralize(openCount, "open task")}</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} color={project.color} height={5} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack users={members} size={22} max={4} />
          <Icon
            name="mingcute:arrow-right-line"
            size={15}
            className="text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
          />
        </div>
      </Link>
    </motion.div>
  );
}

function MyTaskRow({ task }: { task: Task }) {
  const projects = useStore((s) => s.projects);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const openTask = useUI((s) => s.openTask);
  const project = projects.find((p) => p.id === task.projectId);
  if (!project) return null;
  const done = isDone(task, project.statuses);
  const ds = dueState(task.dueDate, done);

  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] transition-colors hover:bg-white/5">
      <Checkbox checked={done} onChange={() => toggleTaskComplete(task.id)} size="sm" />
      <button
        onClick={() => openTask(task.id)}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-[13px] cursor-pointer transition-colors",
          done ? "text-white/35 line-through" : "text-white/85 hover:text-white"
        )}
      >
        {task.title}
      </button>
      <span
        className="hidden items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex"
        style={{ backgroundColor: `${project.color}1c`, color: project.color }}
      >
        <Icon name={project.icon} size={11} />
        <span className="max-w-[110px] truncate">{project.name}</span>
      </span>
      {task.dueDate && (
        <span className={cn("inline-flex shrink-0 items-center gap-1 text-[11px] font-medium", dueStateColor[ds])}>
          <Icon name="mingcute:calendar-line" size={12} />
          {formatDate(task.dueDate)}
        </span>
      )}
      <PriorityFlag priority={task.priority} size={13} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const spaces = useStore((s) => s.spaces);
  const goals = useStore((s) => s.goals);
  const docs = useStore((s) => s.docs);
  const activities = useStore((s) => s.activities);
  const notifications = useStore((s) => s.notifications);
  const favorites = useStore((s) => s.favorites);
  const recentProjectIds = useStore((s) => s.recentProjectIds);
  const openTask = useUI((s) => s.openTask);

  const [tab, setTab] = useState<TabKey>("today");

  const me = users.find((u) => u.id === currentUserId);

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const taskDone = useMemo(() => {
    const map = new Map<string, boolean>();
    tasks.forEach((t) => {
      const p = projectById.get(t.projectId);
      map.set(t.id, p ? isDone(t, p.statuses) : false);
    });
    return map;
  }, [tasks, projectById]);

  const myTasks = useMemo(
    () => tasks.filter((t) => !t.archived && currentUserId !== null && t.assigneeIds.includes(currentUserId)),
    [tasks, currentUserId]
  );

  const buckets = useMemo(() => {
    const open = myTasks.filter((t) => !taskDone.get(t.id));
    const byDue = (a: Task, b: Task) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
    return {
      today: open.filter((t) => dueState(t.dueDate, false) === "today").sort(byDue),
      overdue: open.filter((t) => dueState(t.dueDate, false) === "overdue").sort(byDue),
      upcoming: open
        .filter((t) => {
          const ds = dueState(t.dueDate, false);
          return ds === "soon" || ds === "future";
        })
        .sort(byDue),
      done: myTasks
        .filter((t) => taskDone.get(t.id))
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
        .slice(0, 8),
    } as Record<TabKey, Task[]>;
  }, [myTasks, taskDone]);

  const openCount = myTasks.filter((t) => !taskDone.get(t.id)).length;
  const dueTodayCount = buckets.today.length;
  const unreadCount = notifications.filter((n) => n.userId === currentUserId && !n.read).length;

  const recentProjects = recentProjectIds
    .map((id) => projectById.get(id))
    .filter((p): p is Project => !!p && !p.archived);
  const favProjects = favorites.projects
    .map((id) => projectById.get(id))
    .filter((p): p is Project => !!p && !p.archived);

  const feed = activities.slice(0, 10);
  const topGoals = goals.slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = me?.name.split(" ")[0] ?? "there";

  const entityTitle = (a: Activity): string => {
    if (a.entityType === "task") return tasks.find((t) => t.id === a.entityId)?.title ?? "a task";
    if (a.entityType === "project") return projectById.get(a.entityId)?.name ?? "a project";
    if (a.entityType === "goal") return goals.find((g) => g.id === a.entityId)?.name ?? "a goal";
    if (a.entityType === "doc") return docs.find((d) => d.id === a.entityId)?.title ?? "a doc";
    if (a.entityType === "space") return spaces.find((s) => s.id === a.entityId)?.name ?? "a space";
    return "something";
  };

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* greeting header */}
      <div className="shrink-0 border-b border-white/8 px-6 pb-4 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}>
            <h1 className="text-xl font-bold tracking-tight">
              {greeting}, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="mt-0.5 text-xs text-white/45">
              {format(new Date(), "EEEE, MMMM d")} · Here&apos;s what&apos;s happening across your workspace.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.06 }}
            className="flex flex-wrap gap-2"
          >
            <SummaryChip icon="mingcute:task-2-line" label="Open tasks" value={openCount} color="#818cf8" />
            <SummaryChip icon="mingcute:alarm-2-line" label="Due today" value={dueTodayCount} color="#fbbf24" />
            <SummaryChip icon="mingcute:inbox-line" label="Unread inbox" value={unreadCount} color="#f472b6" />
          </motion.div>
        </div>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* left column */}
          <div className="space-y-5 xl:col-span-2">
            {/* My work */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.05 }}
              className="glass-card p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg accent-gradient shadow-[0_4px_14px_rgba(99,102,241,0.4)]">
                  <Icon name="mingcute:briefcase-2-line" size={15} className="text-white" />
                </span>
                <h2 className="flex-1 text-sm font-semibold">My work</h2>
                <div className="flex gap-1">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "relative h-7 rounded-lg px-2.5 text-[11px] font-medium transition-colors cursor-pointer",
                        tab === t.key ? "text-white" : "text-white/45 hover:text-white/80"
                      )}
                    >
                      {tab === t.key && (
                        <motion.span
                          layoutId="mywork-tab"
                          className="absolute inset-0 rounded-lg bg-white/10"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className={cn("relative", t.key === "overdue" && buckets.overdue.length > 0 && tab !== t.key && "text-rose-300/90")}>
                        {t.label} ({buckets[t.key].length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[330px] space-y-0.5 overflow-y-auto pr-1">
                {buckets[tab].map((t) => (
                  <MyTaskRow key={t.id} task={t} />
                ))}
                {!buckets[tab].length && (
                  <EmptyState
                    icon={tab === "done" ? "mingcute:trophy-line" : "mingcute:celebrate-line"}
                    title={tab === "overdue" ? "Nothing overdue" : tab === "done" ? "Nothing finished recently" : "You're all clear"}
                    body={
                      tab === "today"
                        ? "No tasks due today. Enjoy the headroom."
                        : tab === "upcoming"
                          ? "No upcoming due dates on your plate."
                          : undefined
                    }
                    className="py-8"
                  />
                )}
              </div>
            </motion.section>

            {/* Recents */}
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <Icon name="mingcute:history-line" size={14} className="text-white/40" />
                <SectionLabel>Recent projects</SectionLabel>
              </div>
              {recentProjects.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {recentProjects.map((p, i) => (
                    <ProjectCard key={p.id} project={p} index={i} />
                  ))}
                </div>
              ) : (
                <div className="glass-soft rounded-xl px-4 py-6 text-center text-xs text-white/40">Projects you visit will show up here.</div>
              )}
            </section>

            {/* Favorites */}
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <Icon name="mingcute:star-line" size={14} className="text-amber-300/70" />
                <SectionLabel>Favorites</SectionLabel>
              </div>
              {favProjects.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {favProjects.map((p, i) => (
                    <ProjectCard key={p.id} project={p} index={i} />
                  ))}
                </div>
              ) : (
                <div className="glass-soft rounded-xl px-4 py-6 text-center text-xs text-white/40">
                  Star a project to pin it here for quick access.
                </div>
              )}
            </section>
          </div>

          {/* right column */}
          <div className="space-y-5">
            {/* Activity */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.1 }}
              className="glass-card p-4"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/15">
                  <Icon name="mingcute:flash-line" size={14} className="text-sky-300" />
                </span>
                <h2 className="text-sm font-semibold">Activity</h2>
              </div>
              <div className="space-y-1">
                {feed.map((a, i) => {
                  const actor = a.actorId !== "automation" ? users.find((u) => u.id === a.actorId) : null;
                  const clickable = a.entityType === "task" && tasks.some((t) => t.id === a.entityId);
                  return (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 340, damping: 30, delay: 0.12 + i * 0.03 }}
                      onClick={() => clickable && openTask(a.entityId)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors",
                        clickable ? "cursor-pointer hover:bg-white/5" : "cursor-default"
                      )}
                    >
                      {actor ? (
                        <Avatar user={actor} size={26} />
                      ) : (
                        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
                          <Icon name="mingcute:lightning-line" size={13} className="text-emerald-300" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs leading-snug text-white/70">
                          <span className="font-semibold text-white/90">{actor?.name ?? "Automation"}</span> {activityPhrase(a)}{" "}
                          <span className="font-medium text-white/85">{entityTitle(a)}</span>
                        </span>
                        <span className="mt-0.5 block text-[10px] text-white/30">{timeAgo(a.createdAt)}</span>
                      </span>
                    </motion.button>
                  );
                })}
                {!feed.length && <div className="px-2 py-6 text-center text-xs text-white/40">No activity yet.</div>}
              </div>
            </motion.section>

            {/* Goals snapshot */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.16 }}
              className="glass-card p-4"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/15">
                  <Icon name="mingcute:target-line" size={14} className="text-violet-300" />
                </span>
                <h2 className="flex-1 text-sm font-semibold">Goals snapshot</h2>
                <Link href="/app/goals" className="flex items-center gap-0.5 text-[11px] font-medium text-indigo-300 hover:text-indigo-200">
                  All goals
                  <Icon name="mingcute:arrow-right-line" size={12} />
                </Link>
              </div>
              <div className="space-y-3.5">
                {topGoals.map((g) => {
                  const meta = goalStatusMeta[g.status];
                  const progress = goalProgress(g);
                  return (
                    <div key={g.id}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/85">{g.name}</span>
                        <Badge color={meta.color} size="sm">
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={progress} color={g.color} height={6} className="flex-1" />
                        <span className="w-8 text-right text-[11px] font-semibold text-white/60">{progress}%</span>
                      </div>
                      {g.dueDate && <div className="mt-1 text-[10px] text-white/35">Due {formatDate(g.dueDate)}</div>}
                    </div>
                  );
                })}
                {!topGoals.length && (
                  <div className="px-2 py-6 text-center text-xs text-white/40">No goals yet — set one to track outcomes.</div>
                )}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
