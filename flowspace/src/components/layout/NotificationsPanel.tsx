"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { Avatar, EmptyState, Icon } from "@/components/ui/primitives";

const typeIcon: Record<AppNotification["type"], { icon: string; color: string }> = {
  assigned: { icon: "mingcute:user-add-2-line", color: "#818cf8" },
  mention: { icon: "mingcute:at-line", color: "#f472b6" },
  comment: { icon: "mingcute:chat-2-line", color: "#38bdf8" },
  status_change: { icon: "mingcute:transfer-line", color: "#a78bfa" },
  due_soon: { icon: "mingcute:alarm-2-line", color: "#fbbf24" },
  automation: { icon: "mingcute:lightning-line", color: "#34d399" },
  watcher_update: { icon: "mingcute:eye-2-line", color: "#94a3b8" },
};

export function NotificationsPanel() {
  const open = useUI((s) => s.notificationsOpen);
  const setOpen = useUI((s) => s.setNotificationsOpen);
  const openTask = useUI((s) => s.openTask);
  const notifications = useStore((s) => s.notifications);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);
  const clearAll = useStore((s) => s.clearNotifications);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mine = notifications.filter((n) => n.userId === currentUserId);
  const list = tab === "unread" ? mine.filter((n) => !n.read) : mine;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <motion.aside
            initial={{ x: 420, opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="glass-strong absolute right-3 top-3 bottom-3 w-[400px] max-w-[calc(100vw-24px)] rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl accent-gradient">
                <Icon name="mingcute:notification-line" size={16} className="text-white" />
              </span>
              <h2 className="flex-1 text-[15px] font-semibold">Inbox</h2>
              <button onClick={markAllRead} className="text-[11px] text-indigo-300 hover:text-indigo-200 cursor-pointer font-medium">
                Mark all read
              </button>
              <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                <Icon name="mingcute:close-line" size={16} />
              </button>
            </div>

            <div className="flex gap-1 px-4 pt-3">
              {(["unread", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative h-7 rounded-lg px-3 text-xs font-medium capitalize transition-colors cursor-pointer",
                    tab === t ? "text-white" : "text-white/45 hover:text-white"
                  )}
                >
                  {tab === t && <motion.span layoutId="notif-tab" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative">
                    {t}
                    {t === "unread" && mine.filter((n) => !n.read).length > 0 && ` (${mine.filter((n) => !n.read).length})`}
                  </span>
                </button>
              ))}
              <span className="flex-1" />
              <button onClick={clearAll} className="h-7 rounded-lg px-2 text-[11px] text-white/35 hover:text-rose-300 transition-colors cursor-pointer">
                Clear all
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <AnimatePresence initial={false}>
                {list.map((n) => {
                  const meta = typeIcon[n.type];
                  const actor = n.actorId && n.actorId !== "automation" ? users.find((u) => u.id === n.actorId) : null;
                  return (
                    <motion.button
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      onClick={() => {
                        markRead(n.id);
                        if (n.taskId) {
                          openTask(n.taskId);
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        "glass-soft glass-hover relative w-full rounded-xl p-3 text-left cursor-pointer flex gap-3",
                        !n.read && "border-indigo-400/25"
                      )}
                    >
                      {!n.read && <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-indigo-400" />}
                      <span className="relative shrink-0">
                        {actor ? (
                          <Avatar user={actor} size={32} />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${meta.color}20` }}>
                            <Icon name={meta.icon} size={15} style={{ color: meta.color }} />
                          </span>
                        )}
                        {actor && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[#161828]" style={{ backgroundColor: meta.color }}>
                            <Icon name={meta.icon} size={9} className="text-white" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-white/92 leading-snug pr-4">{n.title}</span>
                        <span className="mt-0.5 block text-xs text-white/45 leading-snug line-clamp-2">{n.body}</span>
                        <span className="mt-1 block text-[10px] text-white/30">{timeAgo(n.createdAt)}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
              {!list.length && (
                <EmptyState
                  icon="mingcute:celebrate-line"
                  title={tab === "unread" ? "You're all caught up" : "No notifications"}
                  body={tab === "unread" ? "New mentions, assignments and updates will land here." : "Activity on your work will show up here."}
                />
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
