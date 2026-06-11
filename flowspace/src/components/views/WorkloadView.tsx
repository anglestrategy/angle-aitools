"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { addDays, differenceInCalendarDays, format, isToday, isWeekend, parseISO, startOfDay } from "date-fns";
import type { ID, Project, Task, User } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { applyFilters, sortTasks } from "@/lib/selectors";
import { cn, isDone, statusOf } from "@/lib/utils";
import { Avatar, Icon, IconButton, ProgressBar, StatusDot } from "@/components/ui/primitives";
import { MenuLabel, Popover } from "@/components/ui/overlay";
import { AssigneePicker } from "@/components/fields/pickers";
import { ViewToolbar, useViewState } from "./ViewToolbar";

const WINDOW_DAYS = 14;
const DEFAULT_ESTIMATE = 4;

interface DayLoad {
  hours: number;
  tasks: { task: Task; hours: number }[];
}

function loadColor(ratio: number) {
  if (ratio >= 1) return "#fb7185";
  if (ratio >= 0.7) return "#fbbf24";
  return "#34d399";
}

const fmtH = (h: number) => {
  const r = Math.round(h * 10) / 10;
  return r % 1 === 0 ? `${r}` : r.toFixed(1);
};

/** distribute a task's estimate evenly across its spanned days */
function taskSpan(task: Task): { start: Date; end: Date; perDay: number } | null {
  const startStr = task.startDate ?? task.dueDate;
  const endStr = task.dueDate ?? task.startDate;
  if (!startStr || !endStr) return null;
  const start = startOfDay(parseISO(startStr));
  const end = startOfDay(parseISO(endStr));
  const spanDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  return { start, end, perDay: (task.estimateHours ?? DEFAULT_ESTIMATE) / spanDays };
}

export function WorkloadView({ project }: { project: Project }) {
  const allTasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const updateTask = useStore((s) => s.updateTask);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);
  const [vs] = useViewState(project.id);
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const anchor = addDays(startOfDay(new Date()), weekOffset * 7);
    return Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(anchor, i));
  }, [weekOffset]);

  const tasks = useMemo(() => sortTasks(applyFilters(allTasks, project, vs), vs), [allTasks, project, vs]);
  const openTasks = useMemo(() => tasks.filter((t) => !isDone(t, project.statuses)), [tasks, project.statuses]);

  const members = useMemo(() => users.filter((u) => project.memberIds.includes(u.id)), [users, project.memberIds]);

  /** rows: one per member + a trailing "Unassigned" row */
  const rows = useMemo(() => {
    const compute = (filter: (t: Task) => boolean) => {
      const mine = openTasks.filter(filter);
      const loads: DayLoad[] = days.map((day) => {
        const cell: DayLoad = { hours: 0, tasks: [] };
        for (const t of mine) {
          const span = taskSpan(t);
          if (!span) continue;
          if (day >= span.start && day <= span.end) {
            cell.hours += span.perDay;
            cell.tasks.push({ task: t, hours: span.perDay });
          }
        }
        return cell;
      });
      return {
        loads,
        windowHours: loads.reduce((s, l) => s + l.hours, 0),
        totalOpenHours: mine.reduce((s, t) => s + (t.estimateHours ?? 0), 0),
      };
    };
    return [
      ...members.map((u) => ({ user: u as User | null, ...compute((t) => t.assigneeIds.includes(u.id)) })),
      { user: null as User | null, ...compute((t) => t.assigneeIds.length === 0) },
    ];
  }, [members, openTasks, days]);

  const dayTotals = useMemo(() => days.map((_, i) => rows.reduce((s, r) => s + r.loads[i].hours, 0)), [days, rows]);
  const teamDailyCapacity = members.reduce((s, u) => s + u.capacityHours / 5, 0) || 1;
  const weekdayCount = days.filter((d) => !isWeekend(d)).length;

  const gridCols = { gridTemplateColumns: `230px repeat(${WINDOW_DAYS}, minmax(46px, 1fr))` };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1 pb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
          <Icon name="mingcute:group-3-line" size={16} className="text-indigo-300" />
        </span>
        <div className="mr-2">
          <div className="text-sm font-semibold text-white/90">
            {format(days[0], "MMM d")} – {format(days[WINDOW_DAYS - 1], "MMM d")}
          </div>
          <div className="text-[10px] text-white/40">
            {WINDOW_DAYS}-day window · {members.length} people
          </div>
        </div>
        <IconButton size="sm" icon="mingcute:left-line" label="Previous week" onClick={() => setWeekOffset((o) => o - 1)} className="glass-soft" />
        <IconButton size="sm" icon="mingcute:right-line" label="Next week" onClick={() => setWeekOffset((o) => o + 1)} className="glass-soft" />
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="h-7 cursor-pointer rounded-lg px-2.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/15"
          >
            Today
          </button>
        )}
      </div>
      <ViewToolbar project={project} hideGroupBy />

      {/* grid */}
      <div className="glass-soft min-h-0 flex-1 overflow-auto rounded-xl">
        <div className="min-w-[940px]">
          {/* day header */}
          <div className="sticky top-0 z-20 grid border-b border-white/8 bg-[#11131f]/95 backdrop-blur-md" style={gridCols}>
            <div className="flex items-center border-r border-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
              Assignee
            </div>
            {days.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 border-l border-white/4 py-1.5",
                  isWeekend(d) && "bg-white/4",
                  isToday(d) && "bg-indigo-500/12"
                )}
              >
                <span className={cn("text-[9px] font-medium uppercase", isToday(d) ? "text-indigo-300" : "text-white/35")}>{format(d, "EEE")}</span>
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                    isToday(d)
                      ? "accent-gradient text-white shadow-[0_2px_8px_rgba(99,102,241,0.5)]"
                      : isWeekend(d)
                        ? "text-white/30"
                        : "text-white/65"
                  )}
                >
                  {format(d, "d")}
                </span>
              </div>
            ))}
          </div>

          {/* member rows */}
          {rows.map((row, ri) => {
            const u = row.user;
            if (!u && row.windowHours === 0 && row.totalOpenHours === 0) return null;
            const dailyCap = u ? u.capacityHours / 5 : 8;
            const windowCapacity = dailyCap * weekdayCount;
            const utilization = windowCapacity > 0 ? row.windowHours / windowCapacity : 0;

            return (
              <motion.div
                key={u?.id ?? "unassigned"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28, delay: ri * 0.04 }}
                className="grid border-b border-white/5 transition-colors hover:bg-white/[0.025]"
                style={gridCols}
              >
                {/* left cell */}
                <div className="flex items-center gap-2.5 border-r border-white/8 px-3 py-2">
                  {u ? (
                    <Avatar user={u} size={30} showOnline />
                  ) : (
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-white/40">
                      <Icon name="mingcute:user-x-line" size={14} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-white/85">{u?.name ?? "Unassigned"}</div>
                    <div className="text-[10px] text-white/35">
                      {u ? `${u.capacityHours}h/wk` : "Needs an owner"} · {fmtH(row.totalOpenHours)}h open
                    </div>
                    {u && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <ProgressBar value={utilization * 100} color={loadColor(utilization)} height={4} className="flex-1" />
                        <span className="w-7 text-right text-[9px] tabular-nums text-white/40">{Math.round(utilization * 100)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* day cells */}
                {days.map((d, i) => (
                  <WorkloadCell
                    key={i}
                    day={d}
                    load={row.loads[i]}
                    dailyCap={dailyCap}
                    unassigned={!u}
                    project={project}
                    onOpen={openTask}
                    onAssign={(task, ids) => {
                      updateTask(task.id, { assigneeIds: ids });
                      if (ids.length) toast("Task assigned", { icon: "mingcute:user-add-line", body: task.title });
                    }}
                  />
                ))}
              </motion.div>
            );
          })}

          {/* summary footer */}
          <div className="sticky bottom-0 z-10 grid border-t border-white/10 bg-[#11131f]/95 backdrop-blur-md" style={gridCols}>
            <div className="flex items-center gap-2 border-r border-white/8 px-3 py-2">
              <Icon name="mingcute:chart-bar-line" size={13} className="text-indigo-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Total / day</span>
            </div>
            {dayTotals.map((total, i) => {
              const ratio = total / teamDailyCapacity;
              return (
                <div
                  key={i}
                  className={cn("flex flex-col items-center justify-center gap-1 border-l border-white/4 py-2", isToday(days[i]) && "bg-indigo-500/10")}
                >
                  <span className={cn("text-[10px] font-semibold tabular-nums", total > 0 ? "text-white/75" : "text-white/25")}>
                    {total > 0 ? `${fmtH(total)}h` : "–"}
                  </span>
                  {total > 0 && (
                    <span className="h-1 w-6 rounded-full" style={{ backgroundColor: loadColor(ratio), boxShadow: `0 0 6px ${loadColor(ratio)}70` }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Day cell with task popover ──────────────────────────────────────────────

function WorkloadCell({
  day,
  load,
  dailyCap,
  unassigned,
  project,
  onOpen,
  onAssign,
}: {
  day: Date;
  load: DayLoad;
  dailyCap: number;
  unassigned: boolean;
  project: Project;
  onOpen: (id: ID) => void;
  onAssign: (task: Task, ids: ID[]) => void;
}) {
  const ratio = load.hours / dailyCap;
  const color = loadColor(ratio);
  const heightPct = load.hours > 0 ? Math.min(100, Math.max(16, ratio * 62)) : 0;

  return (
    <Popover
      width={276}
      disabled={load.tasks.length === 0}
      triggerClassName="block w-full"
      trigger={
        <button
          className={cn(
            "relative h-[72px] w-full overflow-hidden border-l border-white/4 transition-colors",
            isWeekend(day) && "bg-white/[0.03]",
            isToday(day) && "bg-indigo-500/8",
            load.tasks.length > 0 ? "cursor-pointer hover:bg-white/6" : "cursor-default"
          )}
        >
          {load.hours > 0 && (
            <>
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
                className="absolute inset-x-1.5 bottom-1.5 block rounded-md"
                style={{
                  background: `linear-gradient(180deg, ${color}e0, ${color}70)`,
                  boxShadow: `0 0 12px ${color}45, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  opacity: Math.min(1, 0.55 + ratio * 0.45),
                }}
              />
              <span className="absolute inset-x-0 top-1.5 text-center text-[10px] font-semibold tabular-nums text-white/80 drop-shadow">
                {fmtH(load.hours)}h
              </span>
              {ratio >= 1 && (
                <span className="absolute right-1 top-1">
                  <Icon name="mingcute:alert-fill" size={10} className="text-rose-400" />
                </span>
              )}
            </>
          )}
        </button>
      }
    >
      {(close) => (
        <div className="max-h-[300px] overflow-y-auto p-1.5">
          <MenuLabel>
            {format(day, "EEEE, MMM d")} · {fmtH(load.hours)}h of {fmtH(dailyCap)}h
          </MenuLabel>
          {load.tasks.map(({ task, hours }) => {
            const st = statusOf(task, project.statuses);
            return (
              <div
                key={task.id}
                onClick={() => {
                  onOpen(task.id);
                  close();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/8"
              >
                <StatusDot color={st?.color ?? "#64748b"} size={7} />
                <span className="min-w-0 flex-1 truncate text-xs text-white/85">{task.title}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-white/40">{fmtH(hours)}h</span>
                {unassigned && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <AssigneePicker
                      value={task.assigneeIds}
                      memberIds={project.memberIds}
                      onChange={(ids) => onAssign(task, ids)}
                      triggerClassName="shrink-0"
                    >
                      <button
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-dashed border-white/30 text-white/45 transition-colors hover:border-indigo-300 hover:text-indigo-300"
                        title="Assign"
                      >
                        <Icon name="mingcute:user-add-line" size={11} />
                      </button>
                    </AssigneePicker>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
