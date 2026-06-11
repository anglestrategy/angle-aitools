"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificationsPanel } from "@/components/layout/NotificationsPanel";
import { NewProjectModal, NewSpaceModal, NewTaskModal } from "@/components/modals/CreateModals";
import { TaskPanel } from "@/components/task/TaskPanel";
import { Spinner } from "@/components/ui/primitives";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const currentUserId = useStore((s) => s.currentUserId);
  const checkDueTasks = useStore((s) => s.checkDueTasks);
  const openNewTask = useUI((s) => s.openNewTask);

  useEffect(() => {
    if (hydrated && !currentUserId) router.replace("/");
  }, [hydrated, currentUserId, router]);

  // due-date notifications + "due_date_arrives" automation pass
  useEffect(() => {
    if (hydrated && currentUserId) checkDueTasks();
  }, [hydrated, currentUserId, checkDueTasks]);

  // global "n" shortcut for new task (outside inputs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNewTask();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNewTask]);

  if (!hydrated || !currentUserId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 p-3 overflow-hidden">{children}</main>
      </div>
      <CommandPalette />
      <NotificationsPanel />
      <TaskPanel />
      <NewTaskModal />
      <NewProjectModal />
      <NewSpaceModal />
    </div>
  );
}
