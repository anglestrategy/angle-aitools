"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { formatDuration } from "@/lib/utils";
import { Icon, Kbd } from "@/components/ui/primitives";

function RunningTimerPill() {
  const runningTimer = useStore((s) => s.runningTimer);
  const tasks = useStore((s) => s.tasks);
  const stopTimer = useStore((s) => s.stopTimer);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!runningTimer) return;
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, [runningTimer]);

  if (!runningTimer) return null;
  const task = tasks.find((t) => t.id === runningTimer.taskId);
  const mins = Math.max(0, Math.floor((Date.now() - new Date(runningTimer.startedAt).getTime()) / 60000));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/12 pl-3 pr-1.5 h-9"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
      <button onClick={() => task && openTask(task.id)} className="max-w-[160px] truncate text-xs font-medium text-emerald-100 cursor-pointer hover:underline">
        {task?.title ?? "Tracking…"}
      </button>
      <span className="text-[11px] font-semibold text-emerald-300 tabular-nums">{formatDuration(mins || 1)}</span>
      <button
        onClick={() => {
          stopTimer();
          toast("Timer stopped", { body: task ? `Logged time on “${task.title}”` : undefined, icon: "mingcute:time-line" });
        }}
        className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/35 transition-colors cursor-pointer"
        title="Stop timer"
      >
        <Icon name="mingcute:stop-fill" size={12} />
      </button>
    </motion.div>
  );
}

export function Topbar() {
  const router = useRouter();
  const setCommandPalette = useUI((s) => s.setCommandPalette);
  const setNotificationsOpen = useUI((s) => s.setNotificationsOpen);
  const openNewTask = useUI((s) => s.openNewTask);
  const notifications = useStore((s) => s.notifications);
  const currentUserId = useStore((s) => s.currentUserId);
  const unread = notifications.filter((n) => n.userId === currentUserId && !n.read).length;

  return (
    <header className="glass z-20 m-3 mb-0 flex h-[54px] shrink-0 items-center gap-2.5 rounded-2xl px-3">
      {/* back/forward */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white transition-colors cursor-pointer" title="Back">
          <Icon name="mingcute:left-line" size={17} />
        </button>
        <button onClick={() => router.forward()} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white transition-colors cursor-pointer" title="Forward">
          <Icon name="mingcute:right-line" size={17} />
        </button>
      </div>

      {/* search trigger */}
      <button
        onClick={() => setCommandPalette(true)}
        className="glass-soft glass-hover flex h-9 flex-1 max-w-md items-center gap-2.5 rounded-xl px-3 text-left cursor-pointer"
      >
        <Icon name="mingcute:search-line" size={16} className="text-white/40" />
        <span className="flex-1 truncate text-[13px] text-white/35">Search tasks, projects, docs, people…</span>
        <span className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="flex-1" />

      <RunningTimerPill />

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => openNewTask()}
        className="accent-gradient flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold text-white shadow-[0_4px_18px_rgba(99,102,241,0.4)] hover:brightness-110 transition-all cursor-pointer"
      >
        <Icon name="mingcute:add-line" size={16} />
        New task
      </motion.button>

      <button
        onClick={() => setNotificationsOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/55 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
        title="Notifications"
      >
        <Icon name="mingcute:notification-line" size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full accent-gradient px-1 text-[9px] font-bold text-white ring-2 ring-[#0d0f1a]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </header>
  );
}
