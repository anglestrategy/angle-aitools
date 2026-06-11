"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { addDays, format, parseISO, startOfDay } from "date-fns";
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
import type { Activity, ActivityType, Priority, Project } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn, dueState, dueStateColor, formatDate, formatDuration, isDone, priorities, priorityMeta, statusOf, timeAgo } from "@/lib/utils";
import { Avatar, AvatarStack, Icon, ProgressBar, SectionLabel } from "@/components/ui/primitives";

// ─── Shared chart styling ────────────────────────────────────────────────────

const AXIS_TICK = { fill: "rgba(255,255,255,0.3)", fontSize: 10 };
const AXIS_LINE = { stroke: "rgba(255,255,255,0.3)", strokeOpacity: 0.4 };
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(20,22,38,0.96)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
};

const activityIcon: Record<string, { icon: string; color: string }> = {
  created: { icon: "mingcute:add-circle-line", color: "#38bdf8" },
  status_changed: { icon: "mingcute:transfer-line", color: "#a78bfa" },
  priority_changed: { icon: "mingcute:flag-2-line", color: "#fbbf24" },
  assigned: { icon: "mingcute:user-add-line", color: "#34d399" },
  unassigned: { icon: "mingcute:user-x-line", color: "#94a3b8" },
  due_date_changed: { icon: "mingcute:calendar-line", color: "#f472b6" },
  commented: { icon: "mingcute:message-2-line", color: "#38bdf8" },
  tag_added: { icon: "mingcute:tag-line", color: "#a78bfa" },
  tag_removed: { icon: "mingcute:tag-line", color: "#94a3b8" },
  attachment_added: { icon: "mingcute:attachment-line", color: "#94a3b8" },
  subtask_added: { icon: "mingcute:git-merge-line", color: "#38bdf8" },
  subtask_completed: { icon: "mingcute:check-circle-line", color: "#34d399" },
  time_logged: { icon: "mingcute:time-line", color: "#fbbf24" },
  moved: { icon: "mingcute:arrow-right-line", color: "#a78bfa" },
  completed: { icon: "mingcute:check-circle-line", color: "#34d399" },
  reopened: { icon: "mingcute:refresh-2-line", color: "#fbbf24" },
  automation_run: { icon: "mingcute:lightning-line", color: "#818cf8" },
  field_changed: { icon: "mingcute:edit-2-line", color: "#94a3b8" },
  renamed: { icon: "mingcute:edit-2-line", color: "#94a3b8" },
  checklist_updated: { icon: "mingcute:checkbox-line", color: "#34d399" },
  dependency_added: { icon: "mingcute:link-2-line", color: "#f472b6" },
};

function activityVerb(a: Activity): string {
  const m = a.meta;
  switch (a.type as ActivityType) {
    case "created":
      return "created this task";
    case "status_changed":
      return `moved ${m.from ? `from ${m.from} ` : ""}to ${m.to}`;
    case "priority_changed":
      return `set priority to ${m.to}`;
    case "assigned":
      return `assigned ${m.user}`;
    case "unassigned":
      return `removed ${m.user}`;
    case "due_date_changed":
      return m.to === "none" ? "cleared the due date" : `set due date to ${formatDate(m.to)}`;
    case "commented":
      return "commented";
    case "tag_added":
      return `added tag ${m.tag}`;
    case "tag_removed":
      return `removed tag ${m.tag}`;
    case "attachment_added":
      return `attached ${m.name}`;
    case "subtask_added":
      return `added subtask “${m.title}”`;
    case "subtask_completed":
      return "completed a subtask";
    case "time_logged":
      return `logged ${formatDuration(parseInt(m.mins ?? "0", 10))}`;
    case "moved":
      return `moved from ${m.from} to ${m.to}`;
    case "completed":
      return "completed this task";
    case "reopened":
      return "reopened this task";
    case "automation_run":
      return `ran automation “${m.name}”`;
    case "renamed":
      return `renamed to “${m.to}”`;
    case "checklist_updated":
      return `checked off “${m.item}”`;
    case "dependency_added":
      return "added a dependency";
    default:
      return "updated this task";
  }
}

// ─── View ────────────────────────────────────────────────────────────────────

export function OverviewView({ project }: { project: Project }) {
  const allTasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const activities = useStore((s) => s.activities);
  const timeEntries = useStore((s) => s.timeEntries);
  const openTask = useUI((s) => s.openTask);

  const tasks = useMemo(() => allTasks.filter((t) => t.projectId === project.id && !t.archived), [allTasks, project.id]);
  const taskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const members = useMemo(() => users.filter((u) => project.memberIds.includes(u.id)), [users, project.memberIds]);

  // ── stats ──
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => isDone(t, project.statuses)).length;
    const inProgress = tasks.filter((t) => statusOf(t, project.statuses)?.kind === "active").length;
    const overdue = tasks.filter((t) => dueState(t.dueDate, isDone(t, project.statuses)) === "overdue").length;
    const estimate = tasks.reduce((s, t) => s + (t.estimateHours ?? 0), 0);
    const loggedMins = timeEntries.filter((te) => taskIds.has(te.taskId)).reduce((s, te) => s + te.durationMins, 0);
    return { total, completed, inProgress, overdue, estimate, loggedMins };
  }, [tasks, project.statuses, timeEntries, taskIds]);

  // ── chart data ──
  const statusData = useMemo(
    () =>
      [...project.statuses]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ name: s.name, value: tasks.filter((t) => t.statusId === s.id).length, color: s.color }))
        .filter((d) => d.value > 0),
    [project.statuses, tasks]
  );

  const assigneeData = useMemo(() => {
    const open = tasks.filter((t) => !isDone(t, project.statuses));
    const rows = members
      .map((u) => ({ name: u.name.split(" ")[0], value: open.filter((t) => t.assigneeIds.includes(u.id)).length, color: u.color }))
      .filter((d) => d.value > 0);
    const unassigned = open.filter((t) => t.assigneeIds.length === 0).length;
    if (unassigned > 0) rows.push({ name: "Unassigned", value: unassigned, color: "#64748b" });
    return rows;
  }, [tasks, project.statuses, members]);

  const trendData = useMemo(() => {
    const today = startOfDay(new Date());
    const completions = tasks.filter((t) => t.completedAt).map((t) => startOfDay(new Date(t.completedAt!)).getTime());
    return Array.from({ length: 21 }, (_, i) => {
      const day = addDays(today, i - 20);
      const cutoff = addDays(day, 1).getTime();
      return { label: format(day, "MMM d"), value: completions.filter((c) => c < cutoff).length };
    });
  }, [tasks]);

  // ── lists ──
  const recentActivity = useMemo(
    () =>
      activities
        .filter(
          (a) =>
            (a.entityType === "task" && taskIds.has(a.entityId)) ||
            (a.entityType === "project" && a.entityId === project.id)
        )
        .slice(0, 8),
    [activities, taskIds, project.id]
  );

  const priorityCounts = useMemo(
    () => priorities.map((p: Priority) => ({ p, count: tasks.filter((t) => t.priority === p && !isDone(t, project.statuses)).length })),
    [tasks, project.statuses]
  );

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return tasks
      .filter((t) => t.dueDate && !isDone(t, project.statuses) && parseISO(t.dueDate) >= today)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
      .slice(0, 5);
  }, [tasks, project.statuses]);

  const statCards: { icon: string; label: string; value: string; sub?: string; color: string }[] = [
    { icon: "mingcute:task-2-line", label: "Total tasks", value: String(stats.total), color: "#818cf8" },
    {
      icon: "mingcute:check-circle-line",
      label: "Completed",
      value: String(stats.completed),
      sub: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : "0%",
      color: "#34d399",
    },
    { icon: "mingcute:loading-line", label: "In progress", value: String(stats.inProgress), color: "#38bdf8" },
    { icon: "mingcute:alarm-2-line", label: "Overdue", value: String(stats.overdue), color: "#fb7185" },
    { icon: "mingcute:sandglass-line", label: "Estimated", value: `${Math.round(stats.estimate)}h`, color: "#fbbf24" },
    { icon: "mingcute:time-line", label: "Time logged", value: formatDuration(stats.loggedMins), color: "#a78bfa" },
  ];

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 300, damping: 26, delay: i * 0.05 },
  });

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="flex flex-col gap-3 pb-4">
        {/* description / meta */}
        {project.description && (
          <motion.div {...stagger(0)} className="glass-card flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="min-w-[220px] flex-1">
              <SectionLabel className="mb-1">About this project</SectionLabel>
              <p className="text-sm leading-relaxed text-white/75">{project.description}</p>
            </div>
            <div className="flex items-center gap-5">
              <div>
                <SectionLabel className="mb-1.5">Members</SectionLabel>
                <AvatarStack users={members} size={26} max={6} />
              </div>
              {(project.startDate || project.targetDate) && (
                <div>
                  <SectionLabel className="mb-1.5">Timeline</SectionLabel>
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <Icon name="mingcute:calendar-line" size={14} className="text-indigo-300" />
                    {project.startDate ? formatDate(project.startDate) : "—"}
                    <Icon name="mingcute:arrow-right-line" size={12} className="text-white/35" />
                    {project.targetDate ? formatDate(project.targetDate) : "—"}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* stat cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {statCards.map((c, i) => (
            <motion.div key={c.label} {...stagger(i)} className="glass-card sheen px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.color}1f` }}>
                  <Icon name={c.icon} size={16} style={{ color: c.color }} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tabular-nums tracking-tight text-white">{c.value}</span>
                    {c.sub && <span className="text-[11px] font-semibold" style={{ color: c.color }}>{c.sub}</span>}
                  </div>
                  <div className="truncate text-[10px] font-medium uppercase tracking-wider text-white/40">{c.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* charts */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* donut by status */}
          <motion.div {...stagger(1)} className="glass-card px-4 py-4">
            <SectionLabel className="mb-2">Tasks by status</SectionLabel>
            <div className="relative h-44">
              {statusData.length ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={3} strokeWidth={0}>
                        {statusData.map((d) => (
                          <Cell key={d.name} fill={d.color} style={{ filter: `drop-shadow(0 0 6px ${d.color}50)` }} />
                        ))}
                      </Pie>
                      <RTooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "#fff" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-white">{stats.total}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">tasks</span>
                  </div>
                </>
              ) : (
                <ChartEmpty label="No tasks yet" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {statusData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-white/55">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name} <span className="tabular-nums text-white/35">{d.value}</span>
                </span>
              ))}
            </div>
          </motion.div>

          {/* bar by assignee */}
          <motion.div {...stagger(2)} className="glass-card px-4 py-4">
            <SectionLabel className="mb-2">Open tasks by assignee</SectionLabel>
            <div className="h-[212px]">
              {assigneeData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assigneeData} margin={{ top: 10, right: 6, left: -26, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval={0} />
                    <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} allowDecimals={false} />
                    <RTooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                    <Bar dataKey="value" name="Open tasks" radius={[6, 6, 0, 0]} maxBarSize={34}>
                      {assigneeData.map((d) => (
                        <Cell key={d.name} fill={d.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty label="No open tasks" />
              )}
            </div>
          </motion.div>

          {/* completion trend */}
          <motion.div {...stagger(3)} className="glass-card px-4 py-4">
            <SectionLabel className="mb-2">Completed · last 21 days</SectionLabel>
            <div className="h-[212px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 6, left: -26, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`trend-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval={4} />
                  <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} allowDecimals={false} />
                  <RTooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "#fff" }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Completed"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fill={`url(#trend-${project.id})`}
                    dot={false}
                    activeDot={{ r: 4, fill: "#818cf8", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* lower columns */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* recent activity */}
          <motion.div {...stagger(4)} className="glass-card px-4 py-4">
            <SectionLabel className="mb-2.5">Recent activity</SectionLabel>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/35">No activity yet</p>
            ) : (
              <div className="flex flex-col">
                {recentActivity.map((a, i) => {
                  const meta = activityIcon[a.type] ?? { icon: "mingcute:history-line", color: "#94a3b8" };
                  const task = a.entityType === "task" ? taskById.get(a.entityId) : undefined;
                  const actor = a.actorId === "automation" ? null : users.find((u) => u.id === a.actorId);
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.2 + i * 0.04 }}
                      onClick={task ? () => openTask(task.id) : undefined}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors",
                        task && "cursor-pointer hover:bg-white/5"
                      )}
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${meta.color}1c` }}>
                        <Icon name={meta.icon} size={13} style={{ color: meta.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug text-white/60">
                          <span className="font-medium text-white/90">{a.actorId === "automation" ? "Automation" : actor?.name ?? "Someone"}</span>{" "}
                          {activityVerb(a)}
                          {task && (
                            <>
                              {" · "}
                              <span className="text-white/80">{task.title}</span>
                            </>
                          )}
                        </p>
                        <span className="text-[10px] text-white/30">{timeAgo(a.createdAt)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* priorities + upcoming */}
          <motion.div {...stagger(5)} className="glass-card px-4 py-4">
            <SectionLabel className="mb-2.5">Priority breakdown</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {priorityCounts.map(({ p, count }) => {
                const openTotal = priorityCounts.reduce((s, x) => s + x.count, 0) || 1;
                return (
                  <div key={p} className="flex items-center gap-2.5">
                    <span className="flex w-24 items-center gap-1.5 text-xs font-medium" style={{ color: priorityMeta[p].color }}>
                      <Icon name={priorityMeta[p].icon} size={13} />
                      {priorityMeta[p].label}
                    </span>
                    <ProgressBar value={(count / openTotal) * 100} color={priorityMeta[p].color} height={5} className="flex-1" />
                    <span className="w-6 text-right text-xs tabular-nums text-white/55">{count}</span>
                  </div>
                );
              })}
            </div>

            <SectionLabel className="mb-2 mt-5">Upcoming</SectionLabel>
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/35">Nothing due soon</p>
            ) : (
              <div className="flex flex-col">
                {upcoming.map((t) => {
                  const st = statusOf(t, project.statuses);
                  const ds = dueState(t.dueDate, false);
                  const assignee = users.find((u) => t.assigneeIds.includes(u.id));
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTask(t.id)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: st?.color ?? "#64748b", boxShadow: `0 0 6px ${st?.color}70` }} />
                      <span className="min-w-0 flex-1 truncate text-xs text-white/85">{t.title}</span>
                      {assignee && <Avatar user={assignee} size={18} />}
                      <span className={cn("flex shrink-0 items-center gap-1 text-[11px] font-medium", dueStateColor[ds])}>
                        <Icon name="mingcute:calendar-line" size={12} />
                        {formatDate(t.dueDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-white/30">
      <Icon name="mingcute:chart-pie-line" size={22} />
      <span className="text-[11px]">{label}</span>
    </div>
  );
}
