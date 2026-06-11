"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { DependencyType, ID, Task } from "@/lib/types";
import { cn, isDone } from "@/lib/utils";
import { Icon, Input, StatusDot } from "@/components/ui/primitives";
import { Popover } from "@/components/ui/overlay";

function statusColorOf(task: Task, projects: ReturnType<typeof useStore.getState>["projects"]) {
  const project = projects.find((p) => p.id === task.projectId);
  return project?.statuses.find((s) => s.id === task.statusId)?.color ?? "#888";
}

function DependencyRow({
  depId,
  other,
  relation,
  done,
}: {
  depId: ID;
  other: Task;
  relation: string;
  done: boolean;
}) {
  const projects = useStore((s) => s.projects);
  const removeDependency = useStore((s) => s.removeDependency);
  const openTask = useUI((s) => s.openTask);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group glass-soft glass-hover flex items-center gap-2.5 rounded-xl px-3 py-2"
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
          done ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
        )}
      >
        <Icon name={done ? "mingcute:check-circle-line" : "mingcute:forbid-circle-line"} size={14} />
      </span>
      <span className="w-[72px] shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/35">{relation}</span>
      <button
        onClick={() => openTask(other.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] cursor-pointer hover:underline",
          done ? "text-white/45 line-through" : "text-white/85"
        )}
      >
        <StatusDot color={statusColorOf(other, projects)} size={7} />
        <span className="truncate">{other.title}</span>
      </button>
      <button
        onClick={() => removeDependency(depId)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/0 group-hover:text-white/40 hover:!text-rose-300 hover:bg-rose-500/12 transition-colors cursor-pointer"
        title="Remove dependency"
      >
        <Icon name="mingcute:close-line" size={13} />
      </button>
    </motion.div>
  );
}

export function DependencySection({ task }: { task: Task }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const dependencies = useStore((s) => s.dependencies);
  const addDependency = useStore((s) => s.addDependency);
  const toast = useUI((s) => s.toast);

  const [query, setQuery] = useState("");

  const blockedBy = dependencies.filter((d) => d.toTaskId === task.id);
  const blocking = dependencies.filter((d) => d.fromTaskId === task.id);

  const project = projects.find((p) => p.id === task.projectId);
  const openBlockers = blockedBy.filter((d) => {
    const other = tasks.find((t) => t.id === d.fromTaskId);
    const otherProject = other && projects.find((p) => p.id === other.projectId);
    return other && otherProject && !isDone(other, otherProject.statuses);
  });

  const candidates = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const linked = new Set([task.id, ...blockedBy.map((d) => d.fromTaskId), ...blocking.map((d) => d.toTaskId)]);
    return tasks
      .filter((t) => !t.archived && !linked.has(t.id) && t.title.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, tasks, task.id, blockedBy, blocking]);

  const link = (otherId: ID, type: DependencyType, direction: "blockedBy" | "blocking", close: () => void) => {
    if (direction === "blockedBy") addDependency(otherId, task.id, type);
    else addDependency(task.id, otherId, type);
    toast("Dependency added", { icon: "mingcute:link-2-line" });
    setQuery("");
    close();
  };

  if (!project) return null;

  return (
    <section className="border-t border-white/8 px-5 py-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          <Icon name="mingcute:link-2-line" size={13} />
          Dependencies
          {blockedBy.length + blocking.length > 0 && ` (${blockedBy.length + blocking.length})`}
        </span>
        {openBlockers.length > 0 && !task.completedAt && (
          <span className="flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/12 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
            <Icon name="mingcute:forbid-circle-line" size={11} />
            Blocked
          </span>
        )}
        <span className="flex-1" />
        <Popover
          width={300}
          trigger={
            <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/45 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
              <Icon name="mingcute:add-line" size={12} />
              Add
            </button>
          }
        >
          {(close) => (
            <div>
              <div className="border-b border-white/8 p-2">
                <Input
                  autoFocus
                  icon="mingcute:search-line"
                  inputSize="sm"
                  placeholder="Search tasks to link…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="max-h-[260px] overflow-y-auto p-1.5">
                {candidates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/6 transition-colors">
                    <StatusDot color={statusColorOf(t, projects)} size={7} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-white/85">{t.title}</span>
                    <button
                      onClick={() => link(t.id, "blocks", "blockedBy", close)}
                      className="rounded-md bg-rose-500/12 px-1.5 py-0.5 text-[10px] font-medium text-rose-300 hover:bg-rose-500/25 transition-colors cursor-pointer"
                      title="This task is blocked by it"
                    >
                      Blocks this
                    </button>
                    <button
                      onClick={() => link(t.id, "blocks", "blocking", close)}
                      className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
                      title="This task blocks it"
                    >
                      Blocked by this
                    </button>
                  </div>
                ))}
                {!candidates.length && (
                  <div className="px-3 py-5 text-center text-xs text-white/35">
                    {query.trim() ? "No matching tasks" : "Type to search tasks"}
                  </div>
                )}
              </div>
            </div>
          )}
        </Popover>
      </div>

      {blockedBy.length + blocking.length > 0 ? (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {blockedBy.map((d) => {
              const other = tasks.find((t) => t.id === d.fromTaskId);
              if (!other) return null;
              const otherProject = projects.find((p) => p.id === other.projectId);
              const done = otherProject ? isDone(other, otherProject.statuses) : false;
              return (
                <DependencyRow
                  key={d.id}
                  depId={d.id}
                  other={other}
                  relation={d.type === "blocks" ? "Blocked by" : "Waiting on"}
                  done={done}
                />
              );
            })}
            {blocking.map((d) => {
              const other = tasks.find((t) => t.id === d.toTaskId);
              if (!other) return null;
              return <DependencyRow key={d.id} depId={d.id} other={other} relation="Blocking" done={!!task.completedAt} />;
            })}
          </AnimatePresence>
        </div>
      ) : (
        <p className="text-xs text-white/25">No dependencies — link tasks that block or wait on this one.</p>
      )}
    </section>
  );
}
