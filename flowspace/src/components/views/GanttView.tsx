"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isWeekend,
  parseISO,
} from "date-fns";
import type { ID, Project, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { applyFilters, sortTasks, taskProgress } from "@/lib/selectors";
import { cn, isDone, statusOf, todayStr } from "@/lib/utils";
import { AvatarStack, Button, EmptyState, Icon, StatusDot } from "@/components/ui/primitives";
import { ViewToolbar, useViewState } from "./ViewToolbar";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_W = 34;
const ROW_H = 40;
const BAR_H = 26;
const LEFT_W = 260;
const STICKY_BG = "#11131f";

interface DragState {
  taskId: ID;
  mode: "move" | "start" | "end";
  /** snapped day delta */
  delta: number;
  /** true once the pointer travelled > 5px */
  moved: boolean;
}

interface BarGeo {
  start: Date;
  end: Date;
  startIdx: number;
  span: number;
}

const fmtDay = (d: Date) => format(d, "yyyy-MM-dd");

function barGeometry(task: Task, rangeStart: Date, drag: DragState | null): BarGeo {
  let start = parseISO(task.startDate ?? task.dueDate!);
  let end = parseISO(task.dueDate ?? task.startDate!);
  if (drag && drag.taskId === task.id && drag.moved) {
    if (drag.mode === "move") {
      start = addDays(start, drag.delta);
      end = addDays(end, drag.delta);
    } else if (drag.mode === "start") {
      start = addDays(start, drag.delta);
      if (start > end) start = end;
    } else {
      end = addDays(end, drag.delta);
      if (end < start) end = start;
    }
  }
  return {
    start,
    end,
    startIdx: differenceInCalendarDays(start, rangeStart),
    span: differenceInCalendarDays(end, start) + 1,
  };
}

// ─── View ────────────────────────────────────────────────────────────────────

export function GanttView({ project }: { project: Project }) {
  const allTasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const updateTask = useStore((s) => s.updateTask);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);
  const [vs] = useViewState(project.id);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredId, setHoveredId] = useState<ID | null>(null);
  const [unscheduledOpen, setUnscheduledOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);

  const tasks = useMemo(() => sortTasks(applyFilters(allTasks, project, vs), vs), [allTasks, project, vs]);
  const scheduled = useMemo(() => tasks.filter((t) => t.startDate || t.dueDate), [tasks]);
  const unscheduled = useMemo(() => tasks.filter((t) => !t.startDate && !t.dueDate), [tasks]);

  // timeline range: 7 days before earliest → 14 after latest, min 5 weeks
  const { rangeStart, days } = useMemo(() => {
    const dates = scheduled.flatMap((t) => [t.startDate, t.dueDate].filter(Boolean) as string[]).map((d) => parseISO(d));
    const min = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
    const max = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();
    const start = addDays(min, -7);
    let end = addDays(max, 14);
    if (differenceInCalendarDays(end, start) + 1 < 35) end = addDays(start, 34);
    return { rangeStart: start, days: eachDayOfInterval({ start, end }) };
  }, [scheduled]);

  const todayIdx = differenceInCalendarDays(new Date(), rangeStart);
  const timelineW = days.length * DAY_W;
  const totalW = LEFT_W + timelineW;

  const months = useMemo(() => {
    const out: { label: string; count: number }[] = [];
    for (const d of days) {
      const label = format(d, "MMM yyyy");
      const last = out[out.length - 1];
      if (last && last.label === label) last.count += 1;
      else out.push({ label, count: 1 });
    }
    return out;
  }, [days]);

  const scrollToToday = useCallback(
    (smooth = true) => {
      const el = scrollRef.current;
      if (!el) return;
      const x = LEFT_W + todayIdx * DAY_W - (el.clientWidth - LEFT_W) / 2 - LEFT_W;
      el.scrollTo({ left: Math.max(0, x), behavior: smooth ? "smooth" : "auto" });
    },
    [todayIdx]
  );

  useEffect(() => {
    if (didAutoScroll.current) return;
    didAutoScroll.current = true;
    scrollToToday(false);
  }, [scrollToToday]);

  // ── drag handling (manual pointer math, snap to days) ──
  const beginDrag = useCallback(
    (e: React.PointerEvent, task: Task, mode: DragState["mode"]) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const originX = e.clientX;
      const live: DragState = { taskId: task.id, mode, delta: 0, moved: false };
      setDrag({ ...live });

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - originX;
        const moved = live.moved || Math.abs(dx) > 5;
        const delta = Math.round(dx / DAY_W);
        if (delta !== live.delta || moved !== live.moved) {
          live.delta = delta;
          live.moved = moved;
          setDrag({ ...live });
        }
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setDrag(null);

        if (!live.moved) {
          if (mode === "move") openTask(task.id);
          return;
        }
        if (live.delta === 0) return;
        const start = task.startDate ? parseISO(task.startDate) : null;
        const due = task.dueDate ? parseISO(task.dueDate) : null;
        if (mode === "move") {
          updateTask(task.id, {
            ...(start ? { startDate: fmtDay(addDays(start, live.delta)) } : {}),
            ...(due ? { dueDate: fmtDay(addDays(due, live.delta)) } : {}),
          });
          toast("Task rescheduled", { icon: "mingcute:calendar-line", body: task.title });
        } else if (mode === "start") {
          const end = due ?? start!;
          let next = addDays(start ?? end, live.delta);
          if (next > end) next = end;
          updateTask(task.id, { startDate: fmtDay(next) });
          toast("Start date updated", { icon: "mingcute:calendar-line", body: task.title });
        } else {
          const first = start ?? due!;
          let next = addDays(due ?? first, live.delta);
          if (next < first) next = first;
          updateTask(task.id, { dueDate: fmtDay(next) });
          toast("Due date updated", { icon: "mingcute:calendar-line", body: task.title });
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [openTask, toast, updateTask]
  );

  const scheduleTask = (task: Task) => {
    updateTask(task.id, { startDate: todayStr(), dueDate: fmtDay(addDays(new Date(), 2)) });
    toast("Task scheduled", { icon: "mingcute:calendar-add-line", body: `${task.title} · today → ${format(addDays(new Date(), 2), "MMM d")}` });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <ViewToolbar project={project} hideGroupBy />
        </div>
        <Button size="sm" icon="mingcute:aiming-2-line" onClick={() => scrollToToday()} className="shrink-0">
          Today
        </Button>
      </div>

      {/* ── timeline ── */}
      <div ref={scrollRef} className="glass-soft relative min-h-0 flex-1 overflow-auto rounded-xl">
        {scheduled.length === 0 ? (
          <EmptyState
            icon="mingcute:chart-horizontal-line"
            title="Nothing scheduled yet"
            body="Tasks with a start or due date show up here as timeline bars. Schedule one from the Unscheduled list below."
          />
        ) : (
          <div style={{ width: totalW }}>
            {/* header: months + day numbers */}
            <div className="sticky top-0 z-30 flex border-b border-white/8" style={{ width: totalW }}>
              <div
                className="sticky left-0 z-10 flex shrink-0 items-end border-r border-white/8 px-3 pb-1.5"
                style={{ width: LEFT_W, backgroundColor: STICKY_BG }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                  {scheduled.length} scheduled
                </span>
              </div>
              <div className="shrink-0 backdrop-blur-md" style={{ width: timelineW, backgroundColor: "rgba(17,19,31,0.92)" }}>
                <div className="flex h-6 border-b border-white/6">
                  {months.map((m, i) => (
                    <div
                      key={`${m.label}-${i}`}
                      className="flex items-center overflow-hidden border-r border-white/6 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/45"
                      style={{ width: m.count * DAY_W }}
                    >
                      <span className="sticky left-[268px] truncate">{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex h-7">
                  {days.map((d, i) => {
                    const today = i === todayIdx;
                    return (
                      <div
                        key={i}
                        className={cn("flex items-center justify-center", isWeekend(d) && !today && "bg-white/4")}
                        style={{ width: DAY_W }}
                      >
                        {today ? (
                          <span className="accent-gradient flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(99,102,241,0.55)]">
                            {format(d, "d")}
                          </span>
                        ) : (
                          <span className={cn("text-[10px] tabular-nums", isWeekend(d) ? "text-white/25" : "text-white/50")}>
                            {format(d, "d")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* rows */}
            <div className="relative" style={{ width: totalW }}>
              {/* weekend tint + today line, spanning all rows */}
              <div className="pointer-events-none absolute inset-y-0 z-0" style={{ left: LEFT_W, width: timelineW }}>
                {days.map((d, i) =>
                  isWeekend(d) ? (
                    <div key={i} className="absolute inset-y-0 bg-white/[0.025]" style={{ left: i * DAY_W, width: DAY_W }} />
                  ) : null
                )}
                {todayIdx >= 0 && todayIdx < days.length && (
                  <>
                    <div className="absolute inset-y-0 bg-indigo-400/8" style={{ left: todayIdx * DAY_W, width: DAY_W }} />
                    <div
                      className="absolute inset-y-0 w-px"
                      style={{
                        left: todayIdx * DAY_W + DAY_W / 2,
                        background: "linear-gradient(180deg,#818cf8,#a855f7)",
                        boxShadow: "0 0 8px rgba(129,140,248,0.8)",
                      }}
                    />
                  </>
                )}
              </div>

              {scheduled.map((task) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  project={project}
                  geo={barGeometry(task, rangeStart, drag)}
                  subtasks={allTasks.filter((t) => t.parentId === task.id)}
                  users={users}
                  timelineW={timelineW}
                  hovered={hoveredId === task.id}
                  dragging={drag?.taskId === task.id && drag.moved}
                  onHover={(h) => setHoveredId(h ? task.id : null)}
                  onOpen={() => openTask(task.id)}
                  beginDrag={beginDrag}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── unscheduled ── */}
      {unscheduled.length > 0 && (
        <div className="glass-soft mt-2 shrink-0 rounded-xl">
          <button
            onClick={() => setUnscheduledOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/4"
          >
            <motion.span animate={{ rotate: unscheduledOpen ? 90 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
              <Icon name="mingcute:right-line" size={14} className="text-white/45" />
            </motion.span>
            <span className="text-xs font-semibold text-white/80">Unscheduled</span>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/10 px-1 text-[10px] font-bold text-white/55">
              {unscheduled.length}
            </span>
            <span className="ml-auto text-[10px] text-white/30">No start or due date</span>
          </button>
          <AnimatePresence initial={false}>
            {unscheduledOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="overflow-hidden"
              >
                <div className="max-h-36 overflow-y-auto border-t border-white/6 px-1.5 py-1.5">
                  {unscheduled.map((task) => {
                    const st = statusOf(task, project.statuses);
                    return (
                      <div
                        key={task.id}
                        onClick={() => openTask(task.id)}
                        className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/6"
                      >
                        <StatusDot color={st?.color ?? "#64748b"} size={7} />
                        <span className={cn("min-w-0 flex-1 truncate text-xs", isDone(task, project.statuses) ? "text-white/35 line-through" : "text-white/80")}>
                          {task.title}
                        </span>
                        <AvatarStack users={users.filter((u) => task.assigneeIds.includes(u.id))} size={16} max={3} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            scheduleTask(task);
                          }}
                          className="flex h-6 cursor-pointer items-center gap-1 rounded-md px-2 text-[10px] font-medium text-indigo-300 opacity-0 transition-all hover:bg-indigo-500/15 group-hover:opacity-100"
                        >
                          <Icon name="mingcute:calendar-add-line" size={12} />
                          Set dates
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function GanttRow({
  task,
  project,
  geo,
  subtasks,
  users,
  timelineW,
  hovered,
  dragging,
  onHover,
  onOpen,
  beginDrag,
}: {
  task: Task;
  project: Project;
  geo: BarGeo;
  subtasks: Task[];
  users: { id: ID; name: string; initials: string; color: string }[];
  timelineW: number;
  hovered: boolean;
  dragging: boolean;
  onHover: (h: boolean) => void;
  onOpen: () => void;
  beginDrag: (e: React.PointerEvent, task: Task, mode: "move" | "start" | "end") => void;
}) {
  const status = statusOf(task, project.statuses);
  const color = status?.color ?? "#6366f1";
  const done = isDone(task, project.statuses);
  const progress = taskProgress(task, subtasks, project.statuses);
  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));

  const left = geo.startIdx * DAY_W + 3;
  const width = Math.max(geo.span * DAY_W - 6, DAY_W - 6);
  const chipVisible = hovered || dragging;

  return (
    <div
      className="relative z-10 flex border-b border-white/4"
      style={{ height: ROW_H }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* left label */}
      <div
        onClick={onOpen}
        className="sticky left-0 z-20 flex shrink-0 cursor-pointer items-center gap-2 border-r border-white/8 px-3 transition-colors"
        style={{ width: LEFT_W, backgroundColor: hovered ? "#181b2e" : STICKY_BG }}
      >
        <StatusDot color={color} size={7} />
        <span className={cn("min-w-0 flex-1 truncate text-xs", done ? "text-white/35 line-through" : "text-white/85")}>{task.title}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-white/30">{geo.span}d</span>
      </div>

      {/* timeline cell */}
      <div className={cn("relative shrink-0 transition-colors", hovered && "bg-white/[0.035]")} style={{ width: timelineW }}>
        <div
          className={cn(
            "absolute flex touch-none select-none items-center gap-1.5 overflow-hidden rounded-lg px-2",
            dragging ? "cursor-grabbing" : "cursor-grab",
            done && "opacity-50"
          )}
          style={{
            left,
            width,
            top: (ROW_H - BAR_H) / 2,
            height: BAR_H,
            background: `linear-gradient(135deg, ${color}d9, ${color}85)`,
            border: `1px solid ${color}`,
            boxShadow: dragging
              ? `0 6px 24px ${color}70, inset 0 1px 0 rgba(255,255,255,0.35)`
              : `0 2px 12px ${color}40, inset 0 1px 0 rgba(255,255,255,0.28)`,
          }}
          onPointerDown={(e) => beginDrag(e, task, "move")}
        >
          {/* progress overlay */}
          {progress > 0 && <div className="absolute inset-y-0 left-0 bg-black/30" style={{ width: `${progress}%` }} />}
          {width >= 72 && (
            <span className="relative z-10 min-w-0 flex-1 truncate text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              {task.title}
            </span>
          )}
          {width >= 130 && assignees.length > 0 && (
            <span className="relative z-10 shrink-0">
              <AvatarStack users={assignees} size={16} max={3} />
            </span>
          )}
          {/* resize handles */}
          <div
            className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize rounded-l-lg transition-colors hover:bg-white/35"
            onPointerDown={(e) => beginDrag(e, task, "start")}
          />
          <div
            className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize rounded-r-lg transition-colors hover:bg-white/35"
            onPointerDown={(e) => beginDrag(e, task, "end")}
          />
        </div>

        {/* floating date chip */}
        <AnimatePresence>
          {chipVisible && (
            <motion.div
              initial={{ opacity: 0, x: -4, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="glass-strong pointer-events-none absolute z-30 flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] text-white/85"
              style={{ left: left + width + 8, top: (ROW_H - 24) / 2 }}
            >
              <Icon name="mingcute:calendar-line" size={11} className="text-indigo-300" />
              {format(geo.start, "MMM d")}
              {geo.span > 1 && (
                <>
                  <Icon name="mingcute:arrow-right-line" size={10} className="text-white/40" />
                  {format(geo.end, "MMM d")}
                </>
              )}
              <span className="text-white/40">· {geo.span}d</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
