"use client";

import React, { useMemo } from "react";
import type { Activity, ActivityType, ID } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatDate, formatDuration, timeAgo } from "@/lib/utils";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { UserName } from "@/components/fields/pickers";

// ─── Icon + color per activity type ─────────────────────────────────────────

const ACTIVITY_META: Record<ActivityType, { icon: string; color: string }> = {
  created: { icon: "mingcute:add-circle-line", color: "#a5b4fc" },
  status_changed: { icon: "mingcute:transfer-line", color: "#38bdf8" },
  priority_changed: { icon: "mingcute:flag-2-line", color: "#fbbf24" },
  assigned: { icon: "mingcute:user-add-line", color: "#34d399" },
  unassigned: { icon: "mingcute:user-x-line", color: "#94a3b8" },
  due_date_changed: { icon: "mingcute:calendar-line", color: "#f59e0b" },
  commented: { icon: "mingcute:message-2-line", color: "#a5b4fc" },
  tag_added: { icon: "mingcute:tag-line", color: "#a855f7" },
  tag_removed: { icon: "mingcute:tag-line", color: "#94a3b8" },
  attachment_added: { icon: "mingcute:attachment-2-line", color: "#0ea5e9" },
  subtask_added: { icon: "mingcute:git-branch-line", color: "#818cf8" },
  subtask_completed: { icon: "mingcute:check-circle-fill", color: "#34d399" },
  time_logged: { icon: "mingcute:time-line", color: "#2dd4bf" },
  moved: { icon: "mingcute:arrow-right-line", color: "#f97316" },
  completed: { icon: "mingcute:check-circle-fill", color: "#34d399" },
  reopened: { icon: "mingcute:refresh-2-line", color: "#fbbf24" },
  automation_run: { icon: "mingcute:flash-line", color: "#c084fc" },
  field_changed: { icon: "mingcute:settings-3-line", color: "#94a3b8" },
  renamed: { icon: "mingcute:edit-2-line", color: "#94a3b8" },
  checklist_updated: { icon: "mingcute:checkbox-line", color: "#34d399" },
  dependency_added: { icon: "mingcute:link-2-line", color: "#f472b6" },
};

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-white/85">{children}</span>;
}

function ActivitySentence({ activity }: { activity: Activity }) {
  const m = activity.meta;
  switch (activity.type) {
    case "created":
      return <>created this task</>;
    case "status_changed":
      return (
        <>
          moved from <Strong>{m.from || "—"}</Strong> to <Strong>{m.to || "—"}</Strong>
        </>
      );
    case "priority_changed":
      return (
        <>
          changed priority from <Strong>{m.from || "—"}</Strong> to <Strong>{m.to || "—"}</Strong>
        </>
      );
    case "assigned":
      return (
        <>
          assigned <Strong>{m.user || "someone"}</Strong>
        </>
      );
    case "unassigned":
      return (
        <>
          removed <Strong>{m.user || "someone"}</Strong>
        </>
      );
    case "due_date_changed":
      return m.to && m.to !== "none" ? (
        <>
          set the due date to <Strong>{formatDate(m.to)}</Strong>
        </>
      ) : (
        <>removed the due date</>
      );
    case "commented":
      return <>commented on this task</>;
    case "tag_added":
      return (
        <>
          added tag <Strong>{m.tag || "—"}</Strong>
        </>
      );
    case "tag_removed":
      return (
        <>
          removed tag <Strong>{m.tag || "—"}</Strong>
        </>
      );
    case "attachment_added":
      return (
        <>
          attached <Strong>{m.name || "a file"}</Strong>
        </>
      );
    case "subtask_added":
      return (
        <>
          added subtask <Strong>“{m.title || "Untitled"}”</Strong>
        </>
      );
    case "subtask_completed":
      return (
        <>
          completed subtask <Strong>“{m.title || "Untitled"}”</Strong>
        </>
      );
    case "time_logged":
      return (
        <>
          logged <Strong>{formatDuration(parseInt(m.mins || "0", 10) || 0)}</Strong>
        </>
      );
    case "moved":
      return (
        <>
          moved this task from <Strong>{m.from || "—"}</Strong> to <Strong>{m.to || "—"}</Strong>
        </>
      );
    case "completed":
      return <>completed this task</>;
    case "reopened":
      return <>reopened this task</>;
    case "automation_run":
      return (
        <>
          ran <Strong>“{m.name || "Automation"}”</Strong>
          {m.actions ? <> — {m.actions}</> : null}
        </>
      );
    case "field_changed":
      return (
        <>
          updated <Strong>{m.field || "a field"}</Strong>
        </>
      );
    case "renamed":
      return (
        <>
          renamed <Strong>“{m.from || "…"}”</Strong> to <Strong>“{m.to || "…"}”</Strong>
        </>
      );
    case "checklist_updated":
      return (
        <>
          checked off <Strong>“{m.item || "an item"}”</Strong>
        </>
      );
    case "dependency_added":
      return <>added a dependency</>;
    default:
      return <>updated this task</>;
  }
}

function ActivityRow({ activity }: { activity: Activity }) {
  const meta = ACTIVITY_META[activity.type];
  return (
    <div className="relative flex items-start gap-3 py-1.5">
      <span
        className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#171928]"
        style={{ boxShadow: `0 0 12px ${meta.color}25` }}
      >
        <Icon name={meta.icon} size={13} style={{ color: meta.color }} />
      </span>
      <p className="min-w-0 flex-1 pt-1.5 text-xs leading-relaxed text-white/55">
        <span className="font-semibold text-white/90">
          <UserName userId={activity.actorId} />
        </span>{" "}
        <ActivitySentence activity={activity} />
        <span className="ml-1.5 whitespace-nowrap text-[10px] text-white/30">{timeAgo(activity.createdAt)}</span>
      </p>
    </div>
  );
}

// ─── Feed ───────────────────────────────────────────────────────────────────

export function ActivityFeed({ taskId }: { taskId: ID }) {
  const activities = useStore((s) => s.activities);
  const items = useMemo(
    () =>
      activities
        .filter((a) => a.entityType === "task" && a.entityId === taskId)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activities, taskId]
  );

  if (!items.length) {
    return (
      <EmptyState
        icon="mingcute:history-line"
        title="No activity yet"
        body="Changes to this task — status moves, assignments, comments — will show up here."
        className="py-10"
      />
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-4 left-[13px] top-4 w-px bg-white/8" aria-hidden />
      <div>
        {items.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </div>
    </div>
  );
}
