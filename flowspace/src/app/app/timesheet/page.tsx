"use client";

import { motion } from "motion/react";
import React, { useMemo, useState } from "react";
import { addDays, addWeeks, format, isSameWeek, isToday, startOfWeek } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Task, TimeEntry } from "@/lib/types";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { Avatar, Button, EmptyState, Icon, IconButton, Input, ProgressBar } from "@/components/ui/primitives";
import { Popover, Tooltip } from "@/components/ui/overlay";

// ─── Duration parsing ────────────────────────────────────────────────────────

/** parses "1h30m" / "90m" / "1.5h" / "1:30" / bare "2" (= hours); returns minutes, null if invalid */
function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return 0;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 60);
  const colon = s.match(/^(\d+):([0-5]?\d)$/);
  if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  const hm = s.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m?)?$/);
  if (hm && (hm[1] || hm[2])) {
    return Math.round((hm[1] ? parseFloat(hm[1]) * 60 : 0) + (hm[2] ? parseInt(hm[2], 10) : 0));
  }
  return null;
}

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

// ─── Cell input ──────────────────────────────────────────────────────────────

function CellInput({
  mins,
  onCommit,
  onInvalid,
}: {
  mins: number;
  onCommit: (mins: number) => void;
  onInvalid: () => void;
}) {
  const [val, setVal] = useState(mins ? formatDuration(mins) : "");
  const [prevMins, setPrevMins] = useState(mins);
  if (prevMins !== mins) {
    setPrevMins(mins);
    setVal(mins ? formatDuration(mins) : "");
  }

  const commit = () => {
    const parsed = parseDuration(val);
    if (parsed === null) {
      setVal(mins ? formatDuration(mins) : "");
      onInvalid();
      return;
    }
    if (parsed !== mins) onCommit(parsed);
    else setVal(mins ? formatDuration(mins) : "");
  };

  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setVal(mins ? formatDuration(mins) : "");
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="–"
      className={cn(
        "h-7 w-full rounded-lg border border-transparent bg-transparent text-center text-xs transition-all",
        "hover:border-white/12 hover:bg-white/4 focus:border-indigo-400/50 focus:bg-white/6 focus:outline-none",
        val ? "text-white/85 font-medium" : "text-white/25"
      )}
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TimesheetPage() {
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const timeEntries = useStore((s) => s.timeEntries);
  const addTimeEntry = useStore((s) => s.addTimeEntry);
  const deleteTimeEntry = useStore((s) => s.deleteTimeEntry);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [extraTaskIds, setExtraTaskIds] = useState<string[]>([]);
  const [taskQuery, setTaskQuery] = useState("");

  const me = users.find((u) => u.id === currentUserId);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayKeys = useMemo(() => days.map((d) => format(d, "yyyy-MM-dd")), [days]);
  const isThisWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });

  const weekEntries = useMemo(
    () =>
      timeEntries
        .filter((e) => e.userId === currentUserId && dayKeys.includes(e.date))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [timeEntries, currentUserId, dayKeys]
  );

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const rowTasks = useMemo(() => {
    const ids = new Set<string>();
    weekEntries.forEach((e) => ids.add(e.taskId));
    extraTaskIds.forEach((id) => ids.add(id));
    const list = [...ids].map((id) => taskById.get(id)).filter((t): t is Task => !!t);
    return list.sort((a, b) => {
      const pa = projectById.get(a.projectId)?.name ?? "";
      const pb = projectById.get(b.projectId)?.name ?? "";
      return pa.localeCompare(pb) || a.title.localeCompare(b.title);
    });
  }, [weekEntries, extraTaskIds, taskById, projectById]);

  const cellMins = (taskId: string, date: string) =>
    weekEntries.filter((e) => e.taskId === taskId && e.date === date).reduce((s, e) => s + e.durationMins, 0);

  const commitCell = (taskId: string, date: string, mins: number) => {
    const existing = weekEntries.filter((e) => e.taskId === taskId && e.date === date);
    existing.forEach((e) => deleteTimeEntry(e.id));
    if (mins > 0) addTimeEntry(taskId, mins, "Timesheet", date);
  };

  const dayTotals = dayKeys.map((key) => weekEntries.filter((e) => e.date === key).reduce((s, e) => s + e.durationMins, 0));
  const grandTotal = dayTotals.reduce((s, m) => s + m, 0);
  const billableMins = weekEntries.filter((e) => e.billable).reduce((s, e) => s + e.durationMins, 0);
  const billableShare = grandTotal ? Math.round((billableMins / grandTotal) * 100) : 0;

  const projectBreakdown = useMemo(() => {
    const byProject = new Map<string, number>();
    weekEntries.forEach((e) => {
      const pid = taskById.get(e.taskId)?.projectId;
      if (!pid) return;
      byProject.set(pid, (byProject.get(pid) ?? 0) + e.durationMins);
    });
    return [...byProject.entries()]
      .map(([pid, mins]) => ({ project: projectById.get(pid), mins }))
      .filter((x) => !!x.project)
      .sort((a, b) => b.mins - a.mins);
  }, [weekEntries, taskById, projectById]);

  const chartData = days.map((d, i) => ({ day: format(d, "EEE"), hours: Math.round((dayTotals[i] / 60) * 10) / 10 }));

  const pickableTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    const rowIds = new Set(rowTasks.map((t) => t.id));
    let list = tasks.filter((t) => !t.archived && !rowIds.has(t.id));
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q));
    return list.slice(0, 30);
  }, [tasks, taskQuery, rowTasks]);

  const onInvalid = () => toast("Couldn't parse duration", { body: 'Try "1h 30m", "90m" or "1.5h".', kind: "error", icon: "mingcute:warning-line" });

  const gridCols = "grid grid-cols-[minmax(190px,1.6fr)_repeat(7,minmax(68px,1fr))_76px] items-center gap-1";

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_14px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:time-line" size={17} className="text-white" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">Timesheet</h1>
          <p className="text-[11px] text-white/40">Your tracked time, one week at a glance</p>
        </div>
        <span className="flex-1" />
        <div className="flex items-center gap-1.5">
          <IconButton icon="mingcute:left-line" size="sm" label="Previous week" onClick={() => setWeekStart((w) => addWeeks(w, -1))} />
          <Button
            variant={isThisWeek ? "subtle" : "glass"}
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            This week
          </Button>
          <IconButton icon="mingcute:right-line" size="sm" label="Next week" onClick={() => setWeekStart((w) => addWeeks(w, 1))} />
          <span className="ml-2 hidden text-xs font-semibold text-white/70 sm:block">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
          {/* left: grid + entries */}
          <div className="min-w-0 space-y-4">
            {/* week grid */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="glass-card overflow-x-auto p-3"
            >
              <div className="min-w-[760px]">
                {/* header row */}
                <div className={cn(gridCols, "border-b border-white/8 px-1 pb-2")}>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Task</span>
                  {days.map((d) => (
                    <span
                      key={d.toISOString()}
                      className={cn(
                        "text-center text-[11px] font-semibold",
                        isToday(d) ? "text-indigo-300" : "text-white/50"
                      )}
                    >
                      {format(d, "EEE")}
                      <span className={cn("block text-[9px] font-normal", isToday(d) ? "text-indigo-300/70" : "text-white/30")}>
                        {format(d, "d MMM")}
                      </span>
                    </span>
                  ))}
                  <span className="text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Total</span>
                </div>

                {/* task rows */}
                {rowTasks.map((t) => {
                  const project = projectById.get(t.projectId);
                  const rowTotal = dayKeys.reduce((s, key) => s + cellMins(t.id, key), 0);
                  return (
                    <div key={t.id} className={cn(gridCols, "border-b border-white/4 px-1 py-1 hover:bg-white/3 transition-colors rounded-lg")}>
                      <div className="flex min-w-0 items-center gap-2 pr-2">
                        {project && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${project.color}1c` }}>
                            <Icon name={project.icon} size={12} style={{ color: project.color }} />
                          </span>
                        )}
                        <button
                          onClick={() => openTask(t.id)}
                          className="min-w-0 flex-1 truncate text-left text-xs text-white/85 transition-colors cursor-pointer hover:text-white"
                          title={t.title}
                        >
                          {t.title}
                        </button>
                      </div>
                      {dayKeys.map((key) => (
                        <CellInput key={key} mins={cellMins(t.id, key)} onCommit={(m) => commitCell(t.id, key, m)} onInvalid={onInvalid} />
                      ))}
                      <span className="text-right text-xs font-semibold text-white/70">{rowTotal ? formatDuration(rowTotal) : "–"}</span>
                    </div>
                  );
                })}

                {!rowTasks.length && (
                  <div className="px-2 py-6 text-center text-xs text-white/35">No time logged this week yet. Add a row to start.</div>
                )}

                {/* add row + totals footer */}
                <div className={cn(gridCols, "px-1 pt-2")}>
                  <Popover
                    width={300}
                    trigger={
                      <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-indigo-300 transition-colors cursor-pointer hover:bg-indigo-500/12 hover:text-indigo-200">
                        <Icon name="mingcute:add-line" size={14} />
                        Add row
                      </button>
                    }
                  >
                    {(close) => (
                      <>
                        <div className="border-b border-white/8 p-2">
                          <Input
                            autoFocus
                            icon="mingcute:search-line"
                            inputSize="sm"
                            placeholder="Search tasks…"
                            value={taskQuery}
                            onChange={(e) => setTaskQuery(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="max-h-[280px] overflow-y-auto p-1.5">
                          {pickableTasks.map((t) => {
                            const project = projectById.get(t.projectId);
                            return (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setExtraTaskIds((ids) => [...ids, t.id]);
                                  setTaskQuery("");
                                  close();
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer hover:bg-white/8"
                              >
                                {project && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />}
                                <span className="min-w-0 flex-1 truncate text-xs text-white/85">{t.title}</span>
                                <span className="shrink-0 text-[10px] text-white/35">{project?.name}</span>
                              </button>
                            );
                          })}
                          {!pickableTasks.length && <div className="px-3 py-4 text-center text-xs text-white/35">No tasks found</div>}
                        </div>
                      </>
                    )}
                  </Popover>
                  {dayTotals.map((m, i) => (
                    <span key={dayKeys[i]} className={cn("text-center text-[11px] font-semibold", m ? "text-white/75" : "text-white/20")}>
                      {m ? formatDuration(m) : "–"}
                    </span>
                  ))}
                  <span className="text-right text-xs font-bold text-indigo-200">{grandTotal ? formatDuration(grandTotal) : "–"}</span>
                </div>
              </div>
            </motion.div>

            {/* entry list */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.06 }}
              className="glass-card p-4"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/15">
                  <Icon name="mingcute:list-check-line" size={14} className="text-sky-300" />
                </span>
                <h2 className="flex-1 text-sm font-semibold">Entries this week</h2>
                <span className="text-[11px] text-white/40">{weekEntries.length} entries</span>
              </div>
              <div className="space-y-1">
                {weekEntries.map((e: TimeEntry) => {
                  const task = taskById.get(e.taskId);
                  return (
                    <div key={e.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/4">
                      {me && <Avatar user={me} size={24} />}
                      <button
                        onClick={() => task && openTask(task.id)}
                        className="min-w-0 flex-1 truncate text-left text-xs text-white/85 transition-colors cursor-pointer hover:text-white"
                      >
                        {task?.title ?? "Deleted task"}
                        {e.note && <span className="ml-2 text-[11px] text-white/35">· {e.note}</span>}
                      </button>
                      <span className="shrink-0 text-[11px] text-white/40">{formatDate(e.date)}</span>
                      <span className="shrink-0 rounded-md bg-white/6 px-1.5 py-0.5 text-[11px] font-semibold text-white/80">
                        {formatDuration(e.durationMins)}
                      </span>
                      <Tooltip label={e.billable ? "Billable" : "Non-billable"}>
                        <span className={cn("flex h-5 w-5 items-center justify-center", e.billable ? "text-emerald-300" : "text-white/20")}>
                          <Icon name="mingcute:currency-dollar-line" size={14} />
                        </span>
                      </Tooltip>
                      <button
                        onClick={() => {
                          deleteTimeEntry(e.id);
                          toast("Time entry deleted", { kind: "info", icon: "mingcute:delete-2-line" });
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-white/25 opacity-0 transition-all cursor-pointer group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-300"
                        title="Delete entry"
                      >
                        <Icon name="mingcute:delete-2-line" size={13} />
                      </button>
                    </div>
                  );
                })}
                {!weekEntries.length && (
                  <EmptyState
                    icon="mingcute:stopwatch-line"
                    title="No entries this week"
                    body="Log time in the grid above, or start a timer from any task."
                    className="py-8"
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* right summary */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="glass-card p-4">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Total this week</div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight text-white/95">
                  {Math.round((grandTotal / 60) * 10) / 10}
                  <span className="text-base font-semibold text-white/45">h</span>
                </span>
                <span className="mb-1 rounded-full bg-emerald-400/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  {billableShare}% billable
                </span>
              </div>

              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -26 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} unit="h" />
                    <RTooltip {...tooltipStyles} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v}h`, "Tracked"]} />
                    <Bar dataKey="hours" fill="#818cf8" radius={[6, 6, 2, 2]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">By project</div>
              <div className="space-y-3">
                {projectBreakdown.map(({ project, mins }) => (
                  <div key={project!.id}>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px]">
                      <Icon name={project!.icon} size={12} style={{ color: project!.color }} />
                      <span className="min-w-0 flex-1 truncate text-white/75">{project!.name}</span>
                      <span className="font-semibold text-white/55">{formatDuration(mins)}</span>
                    </div>
                    <ProgressBar value={grandTotal ? (mins / grandTotal) * 100 : 0} color={project!.color} height={5} />
                  </div>
                ))}
                {!projectBreakdown.length && <div className="py-4 text-center text-xs text-white/35">Nothing tracked yet this week.</div>}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
