"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn, dueState, dueStateColor, formatDate, priorityMeta, statusOf } from "@/lib/utils";
import { AvatarStack, Badge, EmptyState, Icon, Input, StatusDot } from "@/components/ui/primitives";

const MAX_ROWS = 300;

export default function EverythingPage() {
  const openTask = useUI((s) => s.openTask);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);

  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return tasks
      .filter((t) => {
        if (t.archived) return false;
        if (onlyMine && (!currentUserId || !t.assigneeIds.includes(currentUserId))) return false;
        if (onlyOverdue && !(t.dueDate && !t.completedAt && parseISO(t.dueDate) < new Date(now.getFullYear(), now.getMonth(), now.getDate()))) return false;
        if (onlyUrgent && t.priority !== "urgent") return false;
        if (q && !t.title.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [tasks, query, onlyMine, onlyOverdue, onlyUrgent, currentUserId]);

  const filters = [
    { id: "mine", label: "My tasks", icon: "mingcute:user-3-line", active: onlyMine, toggle: () => setOnlyMine((v) => !v) },
    { id: "overdue", label: "Overdue", icon: "mingcute:alert-line", active: onlyOverdue, toggle: () => setOnlyOverdue((v) => !v) },
    { id: "urgent", label: "Urgent", icon: "mingcute:alert-fill", active: onlyUrgent, toggle: () => setOnlyUrgent((v) => !v) },
  ];

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_16px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:globe-2-line" size={18} className="text-white" />
        </span>
        <div>
          <h1 className="text-[15px] font-semibold text-white/95">Everything</h1>
          <p className="text-[11px] text-white/40">
            {rows.length} task{rows.length === 1 ? "" : "s"} across all projects
          </p>
        </div>
        <span className="flex-1" />
        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={f.toggle}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors cursor-pointer",
                f.active ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-100" : "border-white/10 text-white/55 hover:bg-white/6 hover:text-white"
              )}
            >
              <Icon name={f.icon} size={13} />
              {f.label}
            </button>
          ))}
        </div>
        <Input
          icon="mingcute:search-line"
          inputSize="sm"
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-52"
        />
      </div>

      {/* column header */}
      <div className="hidden grid-cols-[minmax(0,1fr)_150px_120px_96px_84px_84px] items-center gap-3 border-b border-white/8 px-5 py-2 md:grid">
        {["Task", "Project", "Status", "Priority", "Assignees", "Due"].map((h) => (
          <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
            {h}
          </span>
        ))}
      </div>

      {/* rows */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <EmptyState
            icon="mingcute:search-line"
            title="Nothing here"
            body="No tasks match the current search and filters."
          />
        ) : (
          <div className="px-2 py-1.5">
            {rows.slice(0, MAX_ROWS).map((t, i) => {
              const project = projects.find((p) => p.id === t.projectId);
              const status = project ? statusOf(t, project.statuses) : undefined;
              const assignees = users.filter((u) => t.assigneeIds.includes(u.id));
              const ds = dueState(t.dueDate, !!t.completedAt);
              const pm = priorityMeta[t.priority];
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30, delay: Math.min(i * 0.015, 0.3) }}
                  onClick={() => openTask(t.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_84px] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/5 cursor-pointer md:grid-cols-[minmax(0,1fr)_150px_120px_96px_84px_84px]"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <StatusDot color={status?.color ?? "#64748b"} />
                    <span
                      className={cn(
                        "truncate text-[13px]",
                        t.completedAt ? "text-white/35 line-through" : "text-white/85"
                      )}
                    >
                      {t.title}
                    </span>
                    {t.parentId && (
                      <Badge size="sm" className="hidden shrink-0 lg:inline-flex">
                        subtask
                      </Badge>
                    )}
                  </span>
                  <span className="hidden min-w-0 md:block">
                    {project && (
                      <Badge color={project.color} size="sm" className="max-w-full">
                        <Icon name={project.icon} size={10} />
                        <span className="truncate">{project.name}</span>
                      </Badge>
                    )}
                  </span>
                  <span className="hidden text-xs font-medium md:block" style={{ color: status?.color ?? "#94a3b8" }}>
                    {status?.name ?? "—"}
                  </span>
                  <span className="hidden md:block">
                    {t.priority !== "none" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: pm.color }}>
                        <Icon name={pm.icon} size={13} />
                        {pm.label}
                      </span>
                    ) : (
                      <span className="text-xs text-white/25">—</span>
                    )}
                  </span>
                  <span className="hidden md:block">
                    {assignees.length ? <AvatarStack users={assignees} size={20} max={3} /> : <span className="text-xs text-white/25">—</span>}
                  </span>
                  <span className={cn("text-right text-xs tabular-nums md:text-left", dueStateColor[ds])}>
                    {t.dueDate ? formatDate(t.dueDate) : "—"}
                  </span>
                </motion.button>
              );
            })}
            {rows.length > MAX_ROWS && (
              <p className="px-3 py-3 text-center text-[11px] text-white/30">
                Showing the {MAX_ROWS} most recently updated tasks — refine your search to see more.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
