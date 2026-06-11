"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { AppNotification, NotificationType } from "@/lib/types";
import { cn, dueState, dueStateColor, formatDate, formatDateTime, isDone, timeAgo } from "@/lib/utils";
import { Avatar, AvatarStack, Badge, Button, EmptyState, Icon, StatusDot } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlay";

// same mapping pattern as NotificationsPanel
const typeIcon: Record<NotificationType, { icon: string; color: string; label: string }> = {
  assigned: { icon: "mingcute:user-add-2-line", color: "#818cf8", label: "Assigned" },
  mention: { icon: "mingcute:at-line", color: "#f472b6", label: "Mention" },
  comment: { icon: "mingcute:chat-2-line", color: "#38bdf8", label: "Comment" },
  status_change: { icon: "mingcute:transfer-line", color: "#a78bfa", label: "Status" },
  due_soon: { icon: "mingcute:alarm-2-line", color: "#fbbf24", label: "Due" },
  automation: { icon: "mingcute:lightning-line", color: "#34d399", label: "Automation" },
  watcher_update: { icon: "mingcute:eye-2-line", color: "#94a3b8", label: "Watching" },
};

const filterChips: { type: NotificationType; label: string }[] = [
  { type: "assigned", label: "Assigned" },
  { type: "mention", label: "Mentions" },
  { type: "comment", label: "Comments" },
  { type: "status_change", label: "Status" },
  { type: "due_soon", label: "Due" },
  { type: "automation", label: "Automation" },
];

export default function InboxPage() {
  const notifications = useStore((s) => s.notifications);
  const users = useStore((s) => s.users);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const currentUserId = useStore((s) => s.currentUserId);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);
  const clearAll = useStore((s) => s.clearNotifications);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);

  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [typeFilter, setTypeFilter] = useState<NotificationType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const mine = useMemo(() => notifications.filter((n) => n.userId === currentUserId), [notifications, currentUserId]);
  const unreadCount = mine.filter((n) => !n.read).length;

  const list = useMemo(() => {
    let l = tab === "unread" ? mine.filter((n) => !n.read) : mine;
    if (typeFilter) l = l.filter((n) => n.type === typeFilter);
    return l;
  }, [mine, tab, typeFilter]);

  const selected: AppNotification | null = mine.find((n) => n.id === selectedId) ?? list[0] ?? null;
  const selectedTask = selected?.taskId ? tasks.find((t) => t.id === selected.taskId) ?? null : null;
  const selectedProject = selectedTask ? projects.find((p) => p.id === selectedTask.projectId) ?? null : null;
  const selectedStatus = selectedTask && selectedProject ? selectedProject.statuses.find((s) => s.id === selectedTask.statusId) : undefined;
  const selectedActor =
    selected && selected.actorId && selected.actorId !== "automation" ? users.find((u) => u.id === selected.actorId) ?? null : null;

  const onItemClick = (n: AppNotification) => {
    setSelectedId(n.id);
    markRead(n.id);
    if (n.taskId) openTask(n.taskId);
  };

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_14px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:inbox-line" size={17} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight">Inbox</h1>
          <p className="text-[11px] text-white/40">
            {unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        <Button
          variant="glass"
          size="sm"
          icon="mingcute:check-2-line"
          onClick={() => {
            markAllRead();
            toast("All notifications marked read", { icon: "mingcute:check-2-line", kind: "info" });
          }}
          disabled={!unreadCount}
        >
          Mark all read
        </Button>
        <Button variant="danger" size="sm" icon="mingcute:delete-2-line" onClick={() => setConfirmClear(true)} disabled={!mine.length}>
          Clear all
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* left list */}
        <div className="flex min-h-0 w-full flex-col lg:w-[420px] lg:shrink-0 lg:border-r lg:border-white/8">
          <div className="shrink-0 px-4 pt-3">
            <div className="flex items-center gap-1">
              {(["unread", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative h-7 rounded-lg px-3 text-xs font-medium capitalize transition-colors cursor-pointer",
                    tab === t ? "text-white" : "text-white/45 hover:text-white"
                  )}
                >
                  {tab === t && (
                    <motion.span layoutId="inbox-tab" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                  )}
                  <span className="relative">
                    {t}
                    {t === "unread" && unreadCount > 0 && ` (${unreadCount})`}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-b border-white/8 pb-3">
              {filterChips.map((c) => {
                const meta = typeIcon[c.type];
                const active = typeFilter === c.type;
                return (
                  <button
                    key={c.type}
                    onClick={() => setTypeFilter(active ? null : c.type)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
                      active ? "" : "border-white/10 bg-white/4 text-white/50 hover:bg-white/8 hover:text-white/80"
                    )}
                    style={active ? { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}55`, color: meta.color } : undefined}
                  >
                    <Icon name={meta.icon} size={11} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
            <AnimatePresence initial={false}>
              {list.map((n) => {
                const meta = typeIcon[n.type];
                const actor = n.actorId && n.actorId !== "automation" ? users.find((u) => u.id === n.actorId) : null;
                const isSelected = selected?.id === n.id;
                return (
                  <motion.button
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    onClick={() => onItemClick(n)}
                    className={cn(
                      "glass-soft glass-hover relative flex w-full gap-3 rounded-xl p-3 text-left cursor-pointer",
                      !n.read && "border-indigo-400/25",
                      isSelected && "bg-white/8 border-white/20"
                    )}
                  >
                    {!n.read && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-indigo-400" />}
                    <span className="relative shrink-0">
                      {actor ? (
                        <Avatar user={actor} size={32} />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${meta.color}20` }}>
                          <Icon name={meta.icon} size={15} style={{ color: meta.color }} />
                        </span>
                      )}
                      {actor && (
                        <span
                          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[#161828]"
                          style={{ backgroundColor: meta.color }}
                        >
                          <Icon name={meta.icon} size={9} className="text-white" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block pr-4 text-[13px] font-medium leading-snug text-white/92">{n.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-white/45 line-clamp-2">{n.body}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] text-white/30">
                        <Badge color={meta.color} size="sm">
                          {meta.label}
                        </Badge>
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
            {!list.length && (
              <EmptyState
                icon="mingcute:celebrate-line"
                title={tab === "unread" ? "You're all caught up" : "No notifications"}
                body={
                  typeFilter
                    ? "No notifications of this type. Try clearing the filter."
                    : tab === "unread"
                      ? "New mentions, assignments and updates will land here."
                      : "Activity on your work will show up here."
                }
              />
            )}
          </div>
        </div>

        {/* right detail */}
        <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto p-5 lg:flex">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="mx-auto w-full max-w-xl"
            >
              <div className="glass-card p-5">
                <div className="flex items-start gap-3.5">
                  {selectedActor ? (
                    <Avatar user={selectedActor} size={44} />
                  ) : (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${typeIcon[selected.type].color}20` }}
                    >
                      <Icon name={typeIcon[selected.type].icon} size={20} style={{ color: typeIcon[selected.type].color }} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge color={typeIcon[selected.type].color} size="sm">
                        <Icon name={typeIcon[selected.type].icon} size={10} />
                        {typeIcon[selected.type].label}
                      </Badge>
                      {!selected.read && (
                        <Badge color="#818cf8" size="sm">
                          Unread
                        </Badge>
                      )}
                    </div>
                    <h2 className="mt-1.5 text-base font-semibold leading-snug text-white/95">{selected.title}</h2>
                    <p className="mt-0.5 text-[11px] text-white/35">
                      {selectedActor ? `${selectedActor.name} · ` : selected.actorId === "automation" ? "Automation · " : ""}
                      {formatDateTime(selected.createdAt)} ({timeAgo(selected.createdAt)})
                    </p>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/4 p-3.5 text-sm leading-relaxed text-white/75">{selected.body}</p>

                {/* related task summary */}
                {selectedTask && selectedProject && (
                  <div className="mt-4 rounded-xl border border-white/8 bg-white/3 p-3.5">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Related task</div>
                    <button
                      onClick={() => openTask(selectedTask.id)}
                      className="block w-full truncate text-left text-sm font-semibold text-white/90 hover:text-indigo-200 transition-colors cursor-pointer"
                    >
                      {selectedTask.title}
                    </button>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `${selectedProject.color}1c`, color: selectedProject.color }}
                      >
                        <Icon name={selectedProject.icon} size={11} />
                        {selectedProject.name}
                      </span>
                      {selectedStatus && (
                        <Badge color={selectedStatus.color} size="sm">
                          <StatusDot color={selectedStatus.color} size={6} />
                          {selectedStatus.name}
                        </Badge>
                      )}
                      <AvatarStack users={users.filter((u) => selectedTask.assigneeIds.includes(u.id))} size={20} />
                      {selectedTask.dueDate && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-medium",
                            dueStateColor[dueState(selectedTask.dueDate, isDone(selectedTask, selectedProject.statuses))]
                          )}
                        >
                          <Icon name="mingcute:calendar-line" size={12} />
                          Due {formatDate(selectedTask.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-2">
                  {selectedTask && (
                    <Button variant="primary" size="sm" icon="mingcute:external-link-line" onClick={() => openTask(selectedTask.id)}>
                      Open task
                    </Button>
                  )}
                  <Button
                    variant="glass"
                    size="sm"
                    icon={selected.read ? "mingcute:mail-line" : "mingcute:mail-open-line"}
                    onClick={() => {
                      markRead(selected.id, !selected.read);
                      toast(selected.read ? "Marked as unread" : "Marked as read", { kind: "info", icon: "mingcute:mail-line" });
                    }}
                  >
                    {selected.read ? "Mark unread" : "Mark read"}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <EmptyState
              icon="mingcute:mailbox-line"
              title="Nothing selected"
              body="Pick a notification on the left to see its full details and the related task here."
              className="m-auto"
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll();
          setSelectedId(null);
          toast("Inbox cleared", { kind: "info", icon: "mingcute:delete-2-line" });
        }}
        title="Clear all notifications?"
        body="This permanently removes every notification in your inbox. This cannot be undone."
        confirmLabel="Clear all"
      />
    </div>
  );
}
