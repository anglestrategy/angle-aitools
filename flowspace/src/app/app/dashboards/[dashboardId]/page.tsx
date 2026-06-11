"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import React, { useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Activity, Dashboard, Goal, GoalStatus, Status, Task, Widget, WidgetType } from "@/lib/types";
import { cn, dueState, dueStateColor, formatDate, formatDuration, priorities, priorityMeta, timeAgo } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Icon, ProgressBar } from "@/components/ui/primitives";
import { MenuItem, MenuList, Modal, ModalHeader, Popover } from "@/components/ui/overlay";
import { PriorityFlag } from "@/components/fields/pickers";

// ─── Chart cosmetics ─────────────────────────────────────────────────────────

const axisTick = { fill: "rgba(255,255,255,0.35)", fontSize: 11 };
const tooltipStyles = {
  contentStyle: {
    background: "rgba(22,24,40,0.94)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  labelStyle: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 4 },
  itemStyle: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
};

const goalStatusMeta: Record<GoalStatus, { label: string; color: string }> = {
  on_track: { label: "On track", color: "#34d399" },
  at_risk: { label: "At risk", color: "#fbbf24" },
  off_track: { label: "Off track", color: "#fb7185" },
  completed: { label: "Completed", color: "#818cf8" },
};

// ─── Workspace task derivations ──────────────────────────────────────────────

function useWorkspace() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  return useMemo(() => {
    const statusById = new Map<string, Status>();
    projects.forEach((p) => p.statuses.forEach((st) => statusById.set(st.id, st)));
    const isTaskDone = (t: Task) => {
      const k = statusById.get(t.statusId)?.kind;
      return k === "done" || k === "closed";
    };
    const live = tasks.filter((t) => !t.archived);
    const open = live.filter((t) => !isTaskDone(t));
    return { live, open, statusById, isTaskDone, projects };
  }, [tasks, projects]);
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

const numberMeta: Record<string, { icon: string; color: string }> = {
  open: { icon: "mingcute:task-2-line", color: "#818cf8" },
  completedWeek: { icon: "mingcute:check-circle-line", color: "#34d399" },
  overdue: { icon: "mingcute:alarm-2-line", color: "#fb7185" },
  hoursWeek: { icon: "mingcute:time-line", color: "#38bdf8" },
  inProgress: { icon: "mingcute:loading-3-line", color: "#fbbf24" },
  inReview: { icon: "mingcute:eye-2-line", color: "#a78bfa" },
};

function NumberCardWidget({ metric }: { metric: string }) {
  const { open, live, statusById } = useWorkspace();
  const timeEntries = useStore((s) => s.timeEntries);

  const weekAgo = subDays(new Date(), 7);
  const twoWeeksAgo = subDays(new Date(), 14);

  let value = "0";
  let sub = "";
  if (metric === "open") {
    const dueToday = open.filter((t) => dueState(t.dueDate, false) === "today").length;
    value = String(open.length);
    sub = dueToday ? `${dueToday} due today` : "nothing due today";
  } else if (metric === "completedWeek") {
    const cur = live.filter((t) => t.completedAt && new Date(t.completedAt) >= weekAgo).length;
    const prev = live.filter((t) => t.completedAt && new Date(t.completedAt) >= twoWeeksAgo && new Date(t.completedAt) < weekAgo).length;
    const delta = cur - prev;
    value = String(cur);
    sub = `${delta >= 0 ? "+" : ""}${delta} vs prior week`;
  } else if (metric === "overdue") {
    const od = open.filter((t) => dueState(t.dueDate, false) === "overdue");
    const urgent = od.filter((t) => t.priority === "urgent").length;
    value = String(od.length);
    sub = urgent ? `${urgent} marked urgent` : od.length ? "needs attention" : "all on schedule";
  } else if (metric === "hoursWeek") {
    const mins = (within: Date, before?: Date) =>
      timeEntries
        .filter((e) => {
          const d = parseISO(e.date);
          return d >= within && (!before || d < before);
        })
        .reduce((s, e) => s + e.durationMins, 0);
    const cur = mins(weekAgo);
    const prev = mins(twoWeeksAgo, weekAgo);
    const deltaH = Math.round(((cur - prev) / 60) * 10) / 10;
    value = `${Math.round((cur / 60) * 10) / 10}h`;
    sub = `${deltaH >= 0 ? "+" : ""}${deltaH}h vs prior week`;
  } else if (metric === "inProgress") {
    const n = open.filter((t) => statusById.get(t.statusId)?.kind === "active").length;
    value = String(n);
    sub = open.length ? `${Math.round((n / open.length) * 100)}% of open work` : "no open work";
  } else if (metric === "inReview") {
    const n = open.filter((t) => (statusById.get(t.statusId)?.name ?? "").toLowerCase().includes("review")).length;
    value = String(n);
    sub = n ? "awaiting a reviewer" : "review queue is clear";
  }

  const meta = numberMeta[metric] ?? numberMeta.open;
  return (
    <div className="flex h-full items-center gap-3.5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${meta.color}1d`, boxShadow: `0 4px 18px ${meta.color}30` }}>
        <Icon name={meta.icon} size={22} style={{ color: meta.color }} />
      </span>
      <div className="min-w-0">
        <div className="text-[26px] font-bold leading-none tracking-tight text-white/95">{value}</div>
        <div className="mt-1.5 truncate text-[11px] text-white/40">{sub}</div>
      </div>
    </div>
  );
}

function TasksByStatusWidget() {
  const { live, statusById } = useWorkspace();
  const data = useMemo(() => {
    const byName = new Map<string, { name: string; value: number; color: string }>();
    live.forEach((t) => {
      const st = statusById.get(t.statusId);
      if (!st) return;
      const cur = byName.get(st.name) ?? { name: st.name, value: 0, color: st.color };
      cur.value += 1;
      byName.set(st.name, cur);
    });
    return [...byName.values()].sort((a, b) => b.value - a.value);
  }, [live, statusById]);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) return <EmptyState icon="mingcute:chart-pie-2-line" title="No tasks yet" className="py-6" />;

  return (
    <div className="flex h-full items-center gap-4">
      <div className="relative h-full min-h-[150px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3} strokeWidth={0}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <RTooltip {...tooltipStyles} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white/95">{total}</span>
          <span className="text-[10px] text-white/35">tasks</span>
        </div>
      </div>
      <div className="max-h-full w-36 space-y-1.5 overflow-y-auto pr-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 flex-1 truncate text-white/65">{d.name}</span>
            <span className="font-semibold text-white/85">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksByAssigneeWidget() {
  const { open } = useWorkspace();
  const users = useStore((s) => s.users);
  const data = useMemo(
    () =>
      users
        .map((u) => ({
          name: u.name.split(" ")[0],
          value: open.filter((t) => t.assigneeIds.includes(u.id)).length,
          color: u.color,
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [users, open]
  );

  if (!data.length) return <EmptyState icon="mingcute:group-2-line" title="No assigned tasks" className="py-6" />;

  return (
    <div className="h-full min-h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={70} />
          <RTooltip {...tooltipStyles} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" name="Open tasks" radius={[4, 8, 8, 4]} barSize={14}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TasksByPriorityWidget() {
  const { open } = useWorkspace();
  const data = useMemo(
    () =>
      priorities.map((p) => ({
        label: priorityMeta[p].label,
        value: open.filter((t) => t.priority === p).length,
        color: priorityMeta[p].color,
      })),
    [open]
  );

  return (
    <div className="h-full min-h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <RTooltip {...tooltipStyles} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" name="Open tasks" radius={[8, 8, 2, 2]} barSize={28}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompletionTrendWidget() {
  const { live } = useWorkspace();
  const data = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const day = subDays(new Date(), 13 - i);
        const key = format(day, "yyyy-MM-dd");
        return {
          day: format(day, "MMM d"),
          completed: live.filter((t) => t.completedAt && format(new Date(t.completedAt), "yyyy-MM-dd") === key).length,
        };
      }),
    [live]
  );

  return (
    <div className="h-full min-h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="dash-trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <RTooltip {...tooltipStyles} />
          <Area type="monotone" dataKey="completed" name="Completed" stroke="#818cf8" strokeWidth={2} fill="url(#dash-trend)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeTrackedWidget() {
  const timeEntries = useStore((s) => s.timeEntries);
  const data = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const key = format(day, "yyyy-MM-dd");
        const mins = timeEntries.filter((e) => e.date === key).reduce((s, e) => s + e.durationMins, 0);
        return { day: format(day, "EEE"), hours: Math.round((mins / 60) * 10) / 10 };
      }),
    [timeEntries]
  );

  return (
    <div className="h-full min-h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} unit="h" />
          <RTooltip {...tooltipStyles} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v}h`, "Tracked"]} />
          <Bar dataKey="hours" name="Hours" fill="#38bdf8" radius={[8, 8, 2, 2]} barSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WorkloadBarWidget() {
  const { open } = useWorkspace();
  const users = useStore((s) => s.users);
  const rows = useMemo(
    () =>
      users
        .map((u) => {
          const est = open.filter((t) => t.assigneeIds.includes(u.id)).reduce((s, t) => s + (t.estimateHours ?? 0), 0);
          const pct = u.capacityHours > 0 ? Math.round((est / u.capacityHours) * 100) : 0;
          return { user: u, est, pct };
        })
        .sort((a, b) => b.pct - a.pct),
    [users, open]
  );

  return (
    <div className="h-full space-y-2.5 overflow-y-auto pr-1">
      {rows.map(({ user, est, pct }) => (
        <div key={user.id} className="flex items-center gap-2.5">
          <Avatar user={user} size={24} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="truncate font-medium text-white/80">{user.name}</span>
              <span className="text-white/40">
                {Math.round(est * 10) / 10}h / {user.capacityHours}h
              </span>
            </div>
            <ProgressBar value={pct} color={pct > 100 ? "#fb7185" : pct > 80 ? "#fbbf24" : user.color} height={5} />
          </div>
          <span className={cn("w-10 shrink-0 text-right text-[11px] font-semibold", pct > 100 ? "text-rose-300" : "text-white/60")}>{pct}%</span>
        </div>
      ))}
    </div>
  );
}

function UpcomingTasksWidget() {
  const { open, projects } = useWorkspace();
  const openTask = useUI((s) => s.openTask);
  const list = useMemo(
    () =>
      open
        .filter((t) => {
          if (!t.dueDate) return false;
          const diff = differenceInCalendarDays(parseISO(t.dueDate), new Date());
          return diff >= 0 && diff <= 7;
        })
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
        .slice(0, 8),
    [open]
  );

  if (!list.length) return <EmptyState icon="mingcute:calendar-2-line" title="Nothing due in the next 7 days" className="py-6" />;

  return (
    <div className="h-full space-y-0.5 overflow-y-auto pr-1">
      {list.map((t) => {
        const project = projects.find((p) => p.id === t.projectId);
        const ds = dueState(t.dueDate, false);
        return (
          <button
            key={t.id}
            onClick={() => openTask(t.id)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer hover:bg-white/5"
          >
            <PriorityFlag priority={t.priority} size={13} />
            <span className="min-w-0 flex-1 truncate text-xs text-white/85">{t.title}</span>
            {project && (
              <span className="hidden items-center gap-1 text-[10px] sm:inline-flex" style={{ color: project.color }}>
                <Icon name={project.icon} size={11} />
                <span className="max-w-[90px] truncate">{project.name}</span>
              </span>
            )}
            <span className={cn("shrink-0 text-[11px] font-medium", dueStateColor[ds])}>{formatDate(t.dueDate)}</span>
          </button>
        );
      })}
    </div>
  );
}

function activityShort(a: Activity): string {
  const m = a.meta;
  switch (a.type) {
    case "created": return "created";
    case "status_changed": return m.to ? `moved to ${m.to}` : "changed status of";
    case "priority_changed": return m.to ? `set ${m.to} priority on` : "reprioritized";
    case "assigned": return m.user ? `assigned ${m.user} to` : "assigned";
    case "unassigned": return "unassigned someone from";
    case "due_date_changed": return "rescheduled";
    case "commented": return "commented on";
    case "tag_added": return "tagged";
    case "tag_removed": return "untagged";
    case "attachment_added": return "attached a file to";
    case "subtask_added": return "added a subtask to";
    case "subtask_completed": return "finished a subtask of";
    case "time_logged": return m.mins ? `logged ${formatDuration(Number(m.mins))} on` : "logged time on";
    case "moved": return "moved";
    case "completed": return "completed";
    case "reopened": return "reopened";
    case "automation_run": return "ran an automation on";
    case "renamed": return "renamed";
    case "checklist_updated": return "checked an item on";
    case "dependency_added": return "linked a dependency to";
    default: return "updated";
  }
}

function RecentActivityWidget() {
  const activities = useStore((s) => s.activities);
  const users = useStore((s) => s.users);
  const tasks = useStore((s) => s.tasks);
  const openTask = useUI((s) => s.openTask);
  const feed = activities.slice(0, 8);

  return (
    <div className="h-full space-y-0.5 overflow-y-auto pr-1">
      {feed.map((a) => {
        const actor = a.actorId !== "automation" ? users.find((u) => u.id === a.actorId) : null;
        const task = a.entityType === "task" ? tasks.find((t) => t.id === a.entityId) : null;
        return (
          <button
            key={a.id}
            onClick={() => task && openTask(task.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
              task ? "cursor-pointer hover:bg-white/5" : "cursor-default"
            )}
          >
            {actor ? (
              <Avatar user={actor} size={22} />
            ) : (
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
                <Icon name="mingcute:lightning-line" size={11} className="text-emerald-300" />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-white/60">
              <span className="font-semibold text-white/85">{actor?.name.split(" ")[0] ?? "Automation"}</span> {activityShort(a)}{" "}
              <span className="text-white/80">{task?.title ?? ""}</span>
            </span>
            <span className="shrink-0 text-[10px] text-white/30">{timeAgo(a.createdAt)}</span>
          </button>
        );
      })}
      {!feed.length && <EmptyState icon="mingcute:history-line" title="No activity yet" className="py-6" />}
    </div>
  );
}

function goalPct(g: Goal): number {
  if (!g.keyResults.length) return g.status === "completed" ? 100 : 0;
  const avg = g.keyResults.reduce((s, kr) => s + Math.min(1, kr.target > 0 ? kr.current / kr.target : 1), 0) / g.keyResults.length;
  return Math.round(avg * 100);
}

function GoalProgressWidget() {
  const goals = useStore((s) => s.goals);
  if (!goals.length) return <EmptyState icon="mingcute:target-line" title="No goals yet" className="py-6" />;
  return (
    <div className="h-full space-y-3 overflow-y-auto pr-1">
      {goals.map((g) => {
        const meta = goalStatusMeta[g.status];
        const pct = goalPct(g);
        return (
          <div key={g.id}>
            <div className="mb-1 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-white/85">{g.name}</span>
              <Badge color={meta.color} size="sm">
                {meta.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2.5">
              <ProgressBar value={pct} color={g.color} height={5} className="flex-1" />
              <span className="w-8 text-right text-[11px] font-semibold text-white/55">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Widget shell ────────────────────────────────────────────────────────────

function WidgetBody({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case "numberCard": return <NumberCardWidget metric={widget.config.metric ?? "open"} />;
    case "tasksByStatus": return <TasksByStatusWidget />;
    case "tasksByAssignee": return <TasksByAssigneeWidget />;
    case "tasksByPriority": return <TasksByPriorityWidget />;
    case "completionTrend": return <CompletionTrendWidget />;
    case "timeTracked": return <TimeTrackedWidget />;
    case "workloadBar": return <WorkloadBarWidget />;
    case "upcomingTasks": return <UpcomingTasksWidget />;
    case "recentActivity": return <RecentActivityWidget />;
    case "goalProgress": return <GoalProgressWidget />;
    default: return null;
  }
}

function WidgetCard({ widget, dashboardId, index }: { widget: Widget; dashboardId: string; index: number }) {
  const removeWidget = useStore((s) => s.removeWidget);
  const toast = useUI((s) => s.toast);
  const span = Math.min(12, Math.max(3, widget.w));

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: Math.min(index, 10) * 0.045 }}
      className="glass-card col-span-12 flex flex-col overflow-hidden md:[grid-column:var(--span)]"
      style={{ ["--span" as string]: `span ${span} / span ${span}`, minHeight: widget.h * 120 } as React.CSSProperties}
    >
      <div className="flex shrink-0 items-center gap-2 px-4 pb-1.5 pt-3">
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold text-white/80">{widget.title}</h3>
        <Popover
          width={170}
          align="end"
          trigger={
            <button className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition-colors cursor-pointer hover:bg-white/10 hover:text-white">
              <Icon name="mingcute:more-2-line" size={14} />
            </button>
          }
        >
          <MenuList>
            <MenuItem
              icon="mingcute:delete-2-line"
              label="Remove widget"
              danger
              onClick={() => {
                removeWidget(dashboardId, widget.id);
                toast("Widget removed", { kind: "info", icon: "mingcute:delete-2-line" });
              }}
            />
          </MenuList>
        </Popover>
      </div>
      <div className="min-h-0 flex-1 px-4 pb-3.5">
        <WidgetBody widget={widget} />
      </div>
    </motion.div>
  );
}

// ─── Add-widget catalog ──────────────────────────────────────────────────────

interface CatalogEntry {
  type: WidgetType;
  title: string;
  icon: string;
  desc: string;
  w: number;
  h: number;
  config: Record<string, string>;
}

const catalog: CatalogEntry[] = [
  { type: "numberCard", title: "Open tasks", icon: "mingcute:task-2-line", desc: "Big number of open tasks workspace-wide", w: 3, h: 1, config: { metric: "open" } },
  { type: "numberCard", title: "Completed this week", icon: "mingcute:check-circle-line", desc: "Tasks finished in the last 7 days", w: 3, h: 1, config: { metric: "completedWeek" } },
  { type: "numberCard", title: "Overdue", icon: "mingcute:alarm-2-line", desc: "Open tasks past their due date", w: 3, h: 1, config: { metric: "overdue" } },
  { type: "numberCard", title: "Hours this week", icon: "mingcute:time-line", desc: "Time tracked in the last 7 days", w: 3, h: 1, config: { metric: "hoursWeek" } },
  { type: "numberCard", title: "In progress", icon: "mingcute:loading-3-line", desc: "Tasks in an active status", w: 3, h: 1, config: { metric: "inProgress" } },
  { type: "numberCard", title: "In review", icon: "mingcute:eye-2-line", desc: "Tasks sitting in a review status", w: 3, h: 1, config: { metric: "inReview" } },
  { type: "tasksByStatus", title: "Tasks by status", icon: "mingcute:chart-pie-line", desc: "Donut of all tasks grouped by status name", w: 6, h: 2, config: {} },
  { type: "tasksByAssignee", title: "Tasks by assignee", icon: "mingcute:chart-horizontal-line", desc: "Open tasks per person, horizontal bars", w: 6, h: 2, config: {} },
  { type: "tasksByPriority", title: "Priority breakdown", icon: "mingcute:flag-2-line", desc: "Open tasks per priority level", w: 6, h: 2, config: {} },
  { type: "completionTrend", title: "Completion trend", icon: "mingcute:trending-up-line", desc: "Tasks completed per day, last 14 days", w: 6, h: 2, config: {} },
  { type: "timeTracked", title: "Time tracked", icon: "mingcute:stopwatch-line", desc: "Hours logged per day, last 7 days", w: 6, h: 2, config: {} },
  { type: "workloadBar", title: "Workload", icon: "mingcute:group-3-line", desc: "Estimated open hours vs each person's capacity", w: 6, h: 2, config: {} },
  { type: "upcomingTasks", title: "Upcoming tasks", icon: "mingcute:calendar-2-line", desc: "Next 8 tasks due within 7 days", w: 6, h: 2, config: {} },
  { type: "recentActivity", title: "Recent activity", icon: "mingcute:history-line", desc: "Latest 8 events across the workspace", w: 6, h: 2, config: {} },
  { type: "goalProgress", title: "Goal progress", icon: "mingcute:target-line", desc: "Every goal with status and key-result progress", w: 6, h: 2, config: {} },
];

// ─── Page ────────────────────────────────────────────────────────────────────

function DashboardDetail({ dashboard }: { dashboard: Dashboard }) {
  const updateDashboard = useStore((s) => s.updateDashboard);
  const addWidget = useStore((s) => s.addWidget);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const toast = useUI((s) => s.toast);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(dashboard.name);
  const [addOpen, setAddOpen] = useState(false);

  const isFav = favorites.dashboards.includes(dashboard.id);

  const commitName = () => {
    const name = nameDraft.trim();
    if (name && name !== dashboard.name) updateDashboard(dashboard.id, { name });
    setEditingName(false);
  };

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <Link
          href="/app/dashboards"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/8 hover:text-white"
          title="All dashboards"
        >
          <Icon name="mingcute:left-line" size={17} />
        </Link>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/18">
          <Icon name={dashboard.icon} size={17} className="text-indigo-300" />
        </span>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameDraft(dashboard.name);
                  setEditingName(false);
                }
              }}
              className="input-glass h-8 w-full max-w-sm px-2.5 text-base font-bold"
            />
          ) : (
            <button
              onClick={() => {
                setNameDraft(dashboard.name);
                setEditingName(true);
              }}
              className="group flex items-center gap-2 text-left cursor-text"
              title="Rename dashboard"
            >
              <h1 className="truncate text-lg font-bold tracking-tight">{dashboard.name}</h1>
              <Icon name="mingcute:edit-2-line" size={14} className="shrink-0 text-white/0 transition-colors group-hover:text-white/45" />
            </button>
          )}
          <p className="text-[11px] text-white/40">
            {dashboard.widgets.length} widget{dashboard.widgets.length === 1 ? "" : "s"} · live workspace data
          </p>
        </div>
        <button
          onClick={() => toggleFavorite("dashboards", dashboard.id)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer",
            isFav ? "text-amber-300" : "text-white/30 hover:text-amber-300"
          )}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Icon name={isFav ? "mingcute:star-fill" : "mingcute:star-line"} size={17} />
        </button>
        <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => setAddOpen(true)}>
          Add widget
        </Button>
      </div>

      {/* grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {dashboard.widgets.length ? (
          <div className="grid grid-cols-12 gap-3.5">
            {dashboard.widgets.map((w, i) => (
              <WidgetCard key={w.id} widget={w} dashboardId={dashboard.id} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="mingcute:layout-grid-line"
            title="An empty canvas"
            body="Add widgets to build a live report from your workspace's tasks, time and goals."
            action={
              <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => setAddOpen(true)}>
                Add your first widget
              </Button>
            }
          />
        )}
      </div>

      {/* add widget modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} width={680}>
        <ModalHeader title="Add widget" icon="mingcute:layout-grid-line" onClose={() => setAddOpen(false)} />
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalog.map((entry) => (
              <button
                key={entry.type + (entry.config.metric ?? "")}
                onClick={() => {
                  addWidget(dashboard.id, { type: entry.type, title: entry.title, w: entry.w, h: entry.h, config: entry.config });
                  toast("Widget added", { icon: "mingcute:add-line" });
                  setAddOpen(false);
                }}
                className="glass-soft glass-hover flex items-start gap-3 rounded-xl p-3 text-left cursor-pointer"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15">
                  <Icon name={entry.icon} size={17} className="text-indigo-300" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-white/90">{entry.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-white/45">{entry.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function DashboardDetailPage() {
  const params = useParams<{ dashboardId: string }>();
  const dashboards = useStore((s) => s.dashboards);
  const hydrated = useStore((s) => s.hydrated);
  const dashboard = dashboards.find((d) => d.id === params.dashboardId);

  if (!dashboard) {
    if (!hydrated) return null;
    return (
      <div className="glass flex h-full items-center justify-center rounded-2xl">
        <EmptyState
          icon="mingcute:dashboard-2-line"
          title="Dashboard not found"
          body="It may have been deleted, or the link is wrong."
          action={
            <Link href="/app/dashboards" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
              Back to dashboards
            </Link>
          }
        />
      </div>
    );
  }

  return <DashboardDetail dashboard={dashboard} />;
}
