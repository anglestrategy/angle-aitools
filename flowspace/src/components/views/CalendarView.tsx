"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { Project, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { applyFilters, sortTasks } from "@/lib/selectors";
import { cn, dueState, formatDate, isDone } from "@/lib/utils";
import { Icon } from "@/components/ui/primitives";
import { Popover } from "@/components/ui/overlay";
import { ViewToolbar, useViewState } from "@/components/views/ViewToolbar";

const DAY_PREFIX = "day::";
const UNSCHEDULED_ID = "unscheduled";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Task pill ───────────────────────────────────────────────────────────────

function PillContent({ task, project, overlay, className }: { task: Task; project: Project; overlay?: boolean; className?: string }) {
  const status = project.statuses.find((s) => s.id === task.statusId);
  const done = isDone(task, project.statuses);
  const overdue = dueState(task.dueDate, !!task.completedAt) === "overdue";
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[11px] font-medium leading-none transition-colors duration-100",
        overdue
          ? "border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
          : "border-white/8 bg-white/6 text-white/80 hover:bg-white/12",
        done && "opacity-50",
        overlay && "drag-overlay-card !bg-[#1a1c2c] border-white/15",
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: status?.color ?? "#888", boxShadow: `0 0 6px ${status?.color ?? "#888"}80` }} />
      <span className={cn("truncate", done && "line-through")}>{task.title}</span>
    </div>
  );
}

function DraggablePill({ task, project }: { task: Task; project: Project }) {
  const openTask = useUI((s) => s.openTask);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        openTask(task.id);
      }}
      className={cn("cursor-pointer select-none", isDragging && "opacity-30")}
    >
      <PillContent task={task} project={project} />
    </div>
  );
}

// ─── Day cell ────────────────────────────────────────────────────────────────

function DayCell({
  day,
  project,
  tasks,
  inMonth,
  isLastColumn,
}: {
  day: Date;
  project: Project;
  tasks: Task[];
  inMonth: boolean;
  isLastColumn: boolean;
}) {
  const openNewTask = useUI((s) => s.openNewTask);
  const openTask = useUI((s) => s.openTask);
  const key = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${key}` });
  const today = isToday(day);
  const visible = tasks.slice(0, 3);
  const extra = tasks.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/day relative flex min-h-0 flex-col gap-1 border-b border-white/6 p-1.5 transition-colors duration-150",
        !isLastColumn && "border-r",
        isWeekend(day) && "bg-white/[0.025]",
        !inMonth && "opacity-40",
        isOver && "bg-indigo-500/12 ring-1 ring-inset ring-indigo-400/40"
      )}
    >
      <div className="flex shrink-0 items-center justify-between">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
            today ? "accent-gradient text-white shadow-[0_2px_10px_rgba(99,102,241,0.5)]" : inMonth ? "text-white/65" : "text-white/35"
          )}
        >
          {format(day, "d")}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openNewTask({ projectId: project.id, dueDate: key });
          }}
          className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 opacity-0 transition-all duration-150 hover:bg-white/10 hover:text-white group-hover/day:opacity-100 cursor-pointer"
          title={`Add task due ${formatDate(key)}`}
        >
          <Icon name="mingcute:add-line" size={13} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {visible.map((t) => (
          <DraggablePill key={t.id} task={t} project={project} />
        ))}
        {extra > 0 && (
          <Popover
            width={260}
            triggerClassName="w-full"
            trigger={
              <button className="w-full rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold text-indigo-300/80 transition-colors hover:bg-indigo-500/15 hover:text-indigo-200 cursor-pointer">
                +{extra} more
              </button>
            }
          >
            {(close) => (
              <div className="max-h-[300px] overflow-y-auto p-2">
                <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  {format(day, "EEEE, MMM d")} · {tasks.length} tasks
                </div>
                <div className="space-y-1">
                  {tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        openTask(t.id);
                        close();
                      }}
                      className="block w-full text-left cursor-pointer"
                    >
                      <PillContent task={t} project={project} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Popover>
        )}
      </div>
    </div>
  );
}

// ─── Unscheduled rail ────────────────────────────────────────────────────────

function UnscheduledRail({
  project,
  tasks,
  collapsed,
  onToggle,
}: {
  project: Project;
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_ID });

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="glass-soft glass-hover flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-2xl py-3 text-white/50 hover:text-white cursor-pointer"
        title="Show unscheduled tasks"
      >
        <Icon name="mingcute:calendar-time-add-line" size={16} />
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1 text-[10px] font-semibold">{tasks.length}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider [writing-mode:vertical-rl]">Unscheduled</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="glass-soft flex h-full w-56 shrink-0 flex-col rounded-2xl"
    >
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <Icon name="mingcute:calendar-time-add-line" size={14} className="text-indigo-300" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-white/80">Unscheduled</span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/8 px-1.5 text-[10px] font-semibold text-white/50">
          {tasks.length}
        </span>
        <button
          onClick={onToggle}
          className="flex h-6 w-6 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          title="Collapse"
        >
          <Icon name="mingcute:right-line" size={14} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 space-y-1.5 overflow-y-auto rounded-b-2xl px-2 pb-2 transition-colors duration-150",
          isOver && "bg-indigo-500/10"
        )}
      >
        {tasks.map((t) => (
          <DraggablePill key={t.id} task={t} project={project} />
        ))}
        {tasks.length === 0 && (
          <div
            className={cn(
              "flex h-20 items-center justify-center rounded-xl border border-dashed px-3 text-center text-[10px] leading-relaxed transition-colors",
              isOver ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-200/80" : "border-white/12 text-white/25"
            )}
          >
            Drop a task here to clear its due date
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export function CalendarView({ project }: { project: Project }) {
  const tasks = useStore((s) => s.tasks);
  const updateTask = useStore((s) => s.updateTask);
  const toast = useUI((s) => s.toast);

  const [vs] = useViewState(project.id);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => sortTasks(applyFilters(tasks, project, vs), vs), [tasks, project, vs]);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtered) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate);
      if (list) list.push(t);
      else map.set(t.dueDate, [t]);
    }
    return map;
  }, [filtered]);

  const unscheduled = useMemo(() => filtered.filter((t) => !t.dueDate), [filtered]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month]
  );
  const weeks = days.length / 7;

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(filtered.find((t) => t.id === String(e.active.id)) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    if (!e.over) return;
    const taskId = String(e.active.id);
    const overId = String(e.over.id);
    const task = filtered.find((t) => t.id === taskId);
    if (!task) return;

    if (overId.startsWith(DAY_PREFIX)) {
      const date = overId.slice(DAY_PREFIX.length);
      if (task.dueDate === date) return;
      updateTask(taskId, { dueDate: date });
      toast("Rescheduled", { body: `“${task.title}” is now due ${formatDate(date)}`, icon: "mingcute:calendar-line" });
    } else if (overId === UNSCHEDULED_ID) {
      if (!task.dueDate) return;
      updateTask(taskId, { dueDate: null });
      toast("Unscheduled", { body: `Cleared due date on “${task.title}”`, icon: "mingcute:calendar-time-add-line", kind: "info" });
    }
  };

  const navBtn = "flex h-7 w-7 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/8 hover:text-white cursor-pointer";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center gap-1.5 px-1 pb-2">
        <h2 className="min-w-36 text-base font-bold tracking-tight">{format(month, "MMMM yyyy")}</h2>
        <button onClick={() => setMonth(subMonths(month, 1))} className={navBtn} title="Previous month">
          <Icon name="mingcute:left-line" size={15} />
        </button>
        <button
          onClick={() => setMonth(startOfMonth(new Date()))}
          className="flex h-7 items-center rounded-lg px-2.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
        >
          Today
        </button>
        <button onClick={() => setMonth(addMonths(month, 1))} className={navBtn} title="Next month">
          <Icon name="mingcute:right-line" size={15} />
        </button>
      </div>

      <ViewToolbar project={project} hideGroupBy />

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveTask(null)}>
        <div className="flex min-h-0 flex-1 gap-3">
          {/* month grid */}
          <div className="glass-soft flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
            <div className="grid shrink-0 grid-cols-7 border-b border-white/8">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={cn("py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider", i >= 5 ? "text-white/30" : "text-white/45")}
                >
                  {d}
                </div>
              ))}
            </div>
            <div
              className="grid min-h-0 flex-1 grid-cols-7 overflow-y-auto"
              style={{ gridTemplateRows: `repeat(${weeks}, minmax(92px, 1fr))` }}
            >
              {days.map((d, i) => (
                <DayCell
                  key={d.toISOString()}
                  day={d}
                  project={project}
                  tasks={byDay.get(format(d, "yyyy-MM-dd")) ?? []}
                  inMonth={isSameMonth(d, month)}
                  isLastColumn={(i + 1) % 7 === 0}
                />
              ))}
            </div>
          </div>

          {/* unscheduled rail */}
          <UnscheduledRail project={project} tasks={unscheduled} collapsed={railCollapsed} onToggle={() => setRailCollapsed((c) => !c)} />
        </div>

        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeTask && (
            <div className="w-44">
              <PillContent task={activeTask} project={project} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
