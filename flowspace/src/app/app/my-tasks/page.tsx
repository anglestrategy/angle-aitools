"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Task } from "@/lib/types";
import { cn, dueState, dueStateColor, formatDate, isDone, priorityMeta } from "@/lib/utils";
import { Checkbox, EmptyState, Icon, Input, Toggle } from "@/components/ui/primitives";
import { MenuItem, MenuLabel, MenuList, Popover } from "@/components/ui/overlay";
import { DatePicker, PriorityPicker, StatusPicker } from "@/components/fields/pickers";

// ─── Sections ────────────────────────────────────────────────────────────────

type SectionKey = "overdue" | "today" | "tomorrow" | "week" | "later" | "none" | "done";

const sectionMeta: Record<SectionKey, { label: string; icon: string; color: string }> = {
  overdue: { label: "Overdue", icon: "mingcute:alarm-2-line", color: "#fb7185" },
  today: { label: "Today", icon: "mingcute:sun-line", color: "#fbbf24" },
  tomorrow: { label: "Tomorrow", icon: "mingcute:sunrise-line", color: "#fb923c" },
  week: { label: "This week", icon: "mingcute:calendar-week-line", color: "#38bdf8" },
  later: { label: "Later", icon: "mingcute:rocket-line", color: "#a78bfa" },
  none: { label: "No due date", icon: "mingcute:calendar-line", color: "#94a3b8" },
  done: { label: "Done", icon: "mingcute:check-circle-line", color: "#34d399" },
};

const sectionOrder: SectionKey[] = ["overdue", "today", "tomorrow", "week", "later", "none", "done"];

type SortKey = "dueDate" | "priority" | "project";

const sortLabels: Record<SortKey, string> = {
  dueDate: "Due date",
  priority: "Priority",
  project: "Project",
};

// ─── Row ─────────────────────────────────────────────────────────────────────

function TaskRow({ task, index }: { task: Task; index: number }) {
  const projects = useStore((s) => s.projects);
  const updateTask = useStore((s) => s.updateTask);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const openTask = useUI((s) => s.openTask);

  const project = projects.find((p) => p.id === task.projectId);
  if (!project) return null;
  const done = isDone(task, project.statuses);
  const ds = dueState(task.dueDate, done);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: "spring", stiffness: 380, damping: 30, delay: Math.min(index, 12) * 0.02 }}
      className="group flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-1.5 transition-colors hover:border-white/8 hover:bg-white/4"
    >
      <Checkbox checked={done} onChange={() => toggleTaskComplete(task.id)} size="sm" />
      <button
        onClick={() => openTask(task.id)}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-[13px] cursor-pointer transition-colors",
          done ? "text-white/35 line-through" : "text-white/88 hover:text-white"
        )}
      >
        {task.title}
      </button>

      <span
        className="hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium md:inline-flex"
        style={{ backgroundColor: `${project.color}1c`, color: project.color }}
      >
        <Icon name={project.icon} size={11} />
        <span className="max-w-[100px] truncate">{project.name}</span>
      </span>

      <span className="hidden sm:block">
        <StatusPicker project={project} value={task.statusId} onChange={(statusId) => updateTask(task.id, { statusId })} />
      </span>
      <PriorityPicker value={task.priority} onChange={(priority) => updateTask(task.id, { priority })} />
      <DatePicker
        value={task.dueDate}
        onChange={(dueDate) => updateTask(task.id, { dueDate })}
        triggerClassName="shrink-0"
      >
        <button className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors cursor-pointer hover:bg-white/8", task.dueDate ? dueStateColor[ds] : "text-white/35")}>
          <Icon name="mingcute:calendar-line" size={13} />
          {task.dueDate ? formatDate(task.dueDate) : "Due"}
        </button>
      </DatePicker>
      <span className={cn("hidden w-12 shrink-0 text-right text-[11px] lg:block", task.estimateHours ? "text-white/45" : "text-white/15")}>
        {task.estimateHours ? `${task.estimateHours}h est` : "—"}
      </span>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const currentUserId = useStore((s) => s.currentUserId);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);

  const [search, setSearch] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("dueDate");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true });

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const myTasks = useMemo(
    () => tasks.filter((t) => !t.archived && currentUserId !== null && t.assigneeIds.includes(currentUserId)),
    [tasks, currentUserId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? myTasks.filter((t) => t.title.toLowerCase().includes(q)) : myTasks;
  }, [myTasks, search]);

  const sections = useMemo(() => {
    const out: Record<SectionKey, Task[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [], none: [], done: [] };
    filtered.forEach((t) => {
      const project = projectById.get(t.projectId);
      const done = project ? isDone(t, project.statuses) : false;
      if (done) {
        out.done.push(t);
        return;
      }
      if (!t.dueDate) {
        out.none.push(t);
        return;
      }
      const diff = differenceInCalendarDays(parseISO(t.dueDate), new Date());
      if (diff < 0) out.overdue.push(t);
      else if (diff === 0) out.today.push(t);
      else if (diff === 1) out.tomorrow.push(t);
      else if (diff <= 7) out.week.push(t);
      else out.later.push(t);
    });

    const cmp = (a: Task, b: Task): number => {
      if (sortBy === "dueDate") return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      if (sortBy === "priority") return priorityMeta[a.priority].rank - priorityMeta[b.priority].rank;
      const pa = projectById.get(a.projectId)?.name ?? "";
      const pb = projectById.get(b.projectId)?.name ?? "";
      return pa.localeCompare(pb) || a.title.localeCompare(b.title);
    };
    (Object.keys(out) as SectionKey[]).forEach((k) => out[k].sort(cmp));
    out.done.sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
    return out;
  }, [filtered, projectById, sortBy]);

  // productivity strip: completions per day, last 7 days
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const completedThisWeek = myTasks.filter((t) => t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const sparkData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const key = format(day, "yyyy-MM-dd");
      return {
        day: format(day, "EEE"),
        count: myTasks.filter((t) => t.completedAt && format(new Date(t.completedAt), "yyyy-MM-dd") === key).length,
      };
    });
  }, [myTasks]);

  const visibleSections = sectionOrder.filter((k) => (k === "done" ? showDone : true));
  const totalShown = visibleSections.reduce((sum, k) => sum + sections[k].length, 0);

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="shrink-0 border-b border-white/8 px-5 pb-3.5 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_14px_rgba(99,102,241,0.4)]">
            <Icon name="mingcute:checkbox-line" size={17} className="text-white" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">My Tasks</h1>
            <p className="text-[11px] text-white/40">Everything assigned to you, across all projects</p>
          </div>

          {/* productivity strip */}
          <div className="glass-soft ml-2 hidden items-center gap-3 rounded-xl px-3 py-1.5 md:flex">
            <div className="leading-tight">
              <div className="text-sm font-bold text-emerald-300">{completedThisWeek}</div>
              <div className="text-[9px] uppercase tracking-wide text-white/35">done this week</div>
            </div>
            <div className="h-9 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="mt-spark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="count" stroke="#34d399" strokeWidth={1.5} fill="url(#mt-spark)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <span className="flex-1" />

          <Input
            icon="mingcute:search-line"
            inputSize="sm"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52"
          />

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/55 select-none">
            <Toggle on={showDone} onChange={setShowDone} size="sm" />
            Show done
          </label>

          <Popover
            width={180}
            align="end"
            trigger={
              <button className="glass-soft glass-hover flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium text-white/80 cursor-pointer">
                <Icon name="mingcute:sort-descending-line" size={14} />
                {sortLabels[sortBy]}
                <Icon name="mingcute:down-line" size={12} className="text-white/40" />
              </button>
            }
          >
            <MenuList>
              <MenuLabel>Sort by</MenuLabel>
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <MenuItem
                  key={k}
                  label={sortLabels[k]}
                  icon={k === "dueDate" ? "mingcute:calendar-line" : k === "priority" ? "mingcute:flag-2-line" : "mingcute:folder-2-line"}
                  active={sortBy === k}
                  onClick={() => setSortBy(k)}
                />
              ))}
            </MenuList>
          </Popover>
        </div>
      </div>

      {/* sections */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {totalShown === 0 ? (
          <EmptyState
            icon={search ? "mingcute:search-3-line" : "mingcute:celebrate-line"}
            title={search ? "No matching tasks" : "Nothing on your plate"}
            body={search ? "Try a different search term." : "Tasks assigned to you will appear here, grouped by due date."}
          />
        ) : (
          <div className="space-y-1.5">
            {visibleSections.map((key) => {
              const meta = sectionMeta[key];
              const list = sections[key];
              if (!list.length) return null;
              const isCollapsed = !!collapsed[key];
              return (
                <section key={key}>
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                    className={cn(
                      "sticky top-0 z-10 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer hover:bg-white/5",
                      key === "overdue" && "bg-rose-500/8"
                    )}
                  >
                    <Icon
                      name="mingcute:down-line"
                      size={14}
                      className={cn("text-white/35 transition-transform", isCollapsed && "-rotate-90")}
                    />
                    <Icon name={meta.icon} size={14} style={{ color: meta.color }} />
                    <span className={cn("text-xs font-semibold", key === "overdue" ? "text-rose-300" : "text-white/85")}>{meta.label}</span>
                    <span
                      className="rounded-full px-1.5 py-px text-[10px] font-semibold"
                      style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
                    >
                      {list.length}
                    </span>
                    <span className="h-px flex-1 bg-white/6" />
                  </button>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-px py-1 pl-1">
                          <AnimatePresence initial={false}>
                            {list.map((t, i) => (
                              <TaskRow key={t.id} task={t} index={i} />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
