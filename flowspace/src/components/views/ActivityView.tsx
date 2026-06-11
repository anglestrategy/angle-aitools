"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { format, isToday, isYesterday } from "date-fns";
import type { Activity, ActivityType, Project } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn, formatDate, formatDuration, timeAgo } from "@/lib/utils";
import { Avatar, EmptyState, Icon } from "@/components/ui/primitives";

// ─── Filters ─────────────────────────────────────────────────────────────────

type FilterId = "all" | "status" | "comments" | "completed" | "automations" | "created";

const FILTERS: { id: FilterId; label: string; icon: string; types?: ActivityType[] }[] = [
  { id: "all", label: "All", icon: "mingcute:history-line" },
  { id: "status", label: "Status", icon: "mingcute:transfer-line", types: ["status_changed", "moved", "reopened"] },
  { id: "comments", label: "Comments", icon: "mingcute:message-2-line", types: ["commented"] },
  { id: "completed", label: "Completed", icon: "mingcute:check-circle-line", types: ["completed", "subtask_completed"] },
  { id: "automations", label: "Automations", icon: "mingcute:lightning-line", types: ["automation_run"] },
  { id: "created", label: "Created", icon: "mingcute:add-circle-line", types: ["created", "subtask_added"] },
];

const typeIcon: Record<string, { icon: string; color: string }> = {
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

// ─── Sentence building ───────────────────────────────────────────────────────

function Subject({ title }: { title: string }) {
  return <span className="font-medium text-white/90">“{title}”</span>;
}

function Sentence({ a, title }: { a: Activity; title: string }) {
  const m = a.meta;
  switch (a.type) {
    case "created":
      return <>created <Subject title={title} /></>;
    case "status_changed":
      return (
        <>
          moved <Subject title={title} /> {m.from && <>from <span className="text-white/75">{m.from}</span> </>}to{" "}
          <span className="text-white/75">{m.to}</span>
        </>
      );
    case "priority_changed":
      return (
        <>
          changed priority of <Subject title={title} /> from <span className="text-white/75">{m.from}</span> to{" "}
          <span className="text-white/75">{m.to}</span>
        </>
      );
    case "assigned":
      return <>assigned <span className="text-white/75">{m.user}</span> to <Subject title={title} /></>;
    case "unassigned":
      return <>removed <span className="text-white/75">{m.user}</span> from <Subject title={title} /></>;
    case "due_date_changed":
      return m.to === "none" ? (
        <>cleared the due date on <Subject title={title} /></>
      ) : (
        <>set the due date of <Subject title={title} /> to <span className="text-white/75">{formatDate(m.to)}</span></>
      );
    case "commented":
      return <>commented on <Subject title={title} /></>;
    case "tag_added":
      return <>added tag <span className="text-white/75">{m.tag}</span> to <Subject title={title} /></>;
    case "tag_removed":
      return <>removed tag <span className="text-white/75">{m.tag}</span> from <Subject title={title} /></>;
    case "attachment_added":
      return <>attached <span className="text-white/75">{m.name}</span> to <Subject title={title} /></>;
    case "subtask_added":
      return <>added subtask <span className="text-white/75">“{m.title}”</span> to <Subject title={title} /></>;
    case "subtask_completed":
      return <>completed a subtask of <Subject title={title} /></>;
    case "time_logged":
      return <>logged <span className="text-white/75">{formatDuration(parseInt(m.mins ?? "0", 10))}</span> on <Subject title={title} /></>;
    case "moved":
      return (
        <>
          moved <Subject title={title} /> from <span className="text-white/75">{m.from}</span> to <span className="text-white/75">{m.to}</span>
        </>
      );
    case "completed":
      return <>completed <Subject title={title} /></>;
    case "reopened":
      return <>reopened <Subject title={title} /></>;
    case "automation_run":
      return (
        <>
          ran automation <span className="font-medium text-indigo-300">“{m.name}”</span> on <Subject title={title} />
          {m.actions && <span className="text-white/45">: {m.actions}</span>}
        </>
      );
    case "renamed":
      return <>renamed <span className="text-white/75">“{m.from}”</span> to <Subject title={m.to ?? title} /></>;
    case "checklist_updated":
      return <>checked off <span className="text-white/75">“{m.item}”</span> in <Subject title={title} /></>;
    case "field_changed":
      return <>updated a field on <Subject title={title} /></>;
    case "dependency_added":
      return <>added a dependency to <Subject title={title} /></>;
    default:
      return <>updated <Subject title={title} /></>;
  }
}

// ─── View ────────────────────────────────────────────────────────────────────

export function ActivityView({ project }: { project: Project }) {
  const allTasks = useStore((s) => s.tasks);
  const activities = useStore((s) => s.activities);
  const users = useStore((s) => s.users);
  const openTask = useUI((s) => s.openTask);
  const [filter, setFilter] = useState<FilterId>("all");

  const taskById = useMemo(
    () => new Map(allTasks.filter((t) => t.projectId === project.id).map((t) => [t.id, t])),
    [allTasks, project.id]
  );

  const filtered = useMemo(() => {
    const def = FILTERS.find((f) => f.id === filter);
    return activities.filter((a) => {
      const inProject =
        (a.entityType === "task" && taskById.has(a.entityId)) || (a.entityType === "project" && a.entityId === project.id);
      if (!inProject) return false;
      return !def?.types || def.types.includes(a.type);
    });
  }, [activities, taskById, project.id, filter]);

  /** group by calendar day, newest first (store keeps activities newest-first) */
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Activity[] }[] = [];
    for (const a of filtered) {
      const d = new Date(a.createdAt);
      const key = format(d, "yyyy-MM-dd");
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(a);
      else out.push({ key, label: isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, MMM d"), items: [a] });
    }
    return out;
  }, [filtered]);

  const counts = useMemo(() => {
    const base = activities.filter(
      (a) => (a.entityType === "task" && taskById.has(a.entityId)) || (a.entityType === "project" && a.entityId === project.id)
    );
    return Object.fromEntries(
      FILTERS.map((f) => [f.id, f.types ? base.filter((a) => f.types!.includes(a.type)).length : base.length])
    ) as Record<FilterId, number>;
  }, [activities, taskById, project.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* filter chips */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-1 pb-2.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-indigo-400/30 bg-indigo-500/20 text-indigo-200"
                : "border-transparent text-white/55 hover:bg-white/8 hover:text-white"
            )}
          >
            <Icon name={f.icon} size={13} />
            {f.label}
            <span className={cn("text-[9px] font-bold tabular-nums", filter === f.id ? "text-indigo-300/80" : "text-white/30")}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* feed */}
      <div className="glass-soft min-h-0 flex-1 overflow-y-auto rounded-xl">
        {groups.length === 0 ? (
          <EmptyState
            icon="mingcute:history-line"
            title="No activity here yet"
            body="Changes to tasks in this project — status moves, comments, automations and more — will show up here."
          />
        ) : (
          <div className="px-3 py-2">
            {groups.map((g, gi) => (
              <div key={g.key}>
                {/* day header */}
                <div className="sticky top-0 z-10 -mx-3 bg-[#11131f]/92 px-4 py-2 backdrop-blur-md">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{g.label}</span>
                    <span className="h-px flex-1 bg-white/6" />
                    <span className="text-[10px] tabular-nums text-white/25">{g.items.length}</span>
                  </div>
                </div>

                {g.items.map((a, i) => {
                  const meta = typeIcon[a.type] ?? { icon: "mingcute:history-line", color: "#94a3b8" };
                  const task = a.entityType === "task" ? taskById.get(a.entityId) : undefined;
                  const title = task?.title ?? (a.entityType === "project" ? project.name : "a task");
                  const actor = a.actorId === "automation" ? null : users.find((u) => u.id === a.actorId);

                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28, delay: Math.min(gi * 0.06 + i * 0.03, 0.5) }}
                      onClick={task ? () => openTask(task.id) : undefined}
                      className={cn(
                        "group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors",
                        task && "cursor-pointer hover:bg-white/5"
                      )}
                    >
                      {/* actor */}
                      {a.actorId === "automation" ? (
                        <span className="accent-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-[0_2px_10px_rgba(99,102,241,0.45)]">
                          <Icon name="mingcute:lightning-line" size={14} className="text-white" />
                        </span>
                      ) : actor ? (
                        <Avatar user={actor} size={28} />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/40">
                          <Icon name="mingcute:user-3-line" size={14} />
                        </span>
                      )}

                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[13px] leading-snug text-white/60">
                          <span className="font-semibold text-white/90">
                            {a.actorId === "automation" ? "Automation" : actor?.name ?? "Someone"}
                          </span>{" "}
                          <Sentence a={a} title={title} />
                        </p>
                      </div>

                      <span className="flex shrink-0 items-center gap-2 pt-1">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${meta.color}1c` }}
                          title={a.type.replace(/_/g, " ")}
                        >
                          <Icon name={meta.icon} size={11} style={{ color: meta.color }} />
                        </span>
                        <span className="whitespace-nowrap text-[10px] tabular-nums text-white/30">{timeAgo(a.createdAt)}</span>
                        {task && (
                          <Icon
                            name="mingcute:right-line"
                            size={12}
                            className="text-white/0 transition-colors group-hover:text-white/40"
                          />
                        )}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
