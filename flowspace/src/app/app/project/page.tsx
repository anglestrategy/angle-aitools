"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Project, ViewType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { projectProgress } from "@/lib/selectors";
import { AvatarStack, EmptyState, Icon, ProgressBar } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";
import { ListView } from "@/components/views/ListView";
import { BoardView } from "@/components/views/BoardView";
import { TableView } from "@/components/views/TableView";
import { CalendarView } from "@/components/views/CalendarView";
import { GanttView } from "@/components/views/GanttView";
import { WorkloadView } from "@/components/views/WorkloadView";
import { OverviewView } from "@/components/views/OverviewView";
import { ActivityView } from "@/components/views/ActivityView";
import { ProjectSettingsModal } from "@/components/modals/ProjectSettingsModal";

const viewMeta: Record<ViewType, { label: string; icon: string }> = {
  overview: { label: "Overview", icon: "mingcute:compass-line" },
  list: { label: "List", icon: "mingcute:list-check-line" },
  board: { label: "Board", icon: "mingcute:columns-3-line" },
  table: { label: "Table", icon: "mingcute:table-2-line" },
  calendar: { label: "Calendar", icon: "mingcute:calendar-month-line" },
  gantt: { label: "Gantt", icon: "mingcute:chart-horizontal-line" },
  workload: { label: "Workload", icon: "mingcute:group-3-line" },
  activity: { label: "Activity", icon: "mingcute:history-line" },
};

function ProjectViews({ project }: { project: Project }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as ViewType | null) ?? project.defaultView;
  const setView = (v: ViewType) => router.replace(`/app/project?id=${project.id}&view=${v}`, { scroll: false });

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const favorites = useStore((s) => s.favorites);
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const deleteProject = useStore((s) => s.deleteProject);
  const updateProject = useStore((s) => s.updateProject);
  const touchRecent = useStore((s) => s.touchRecentProject);
  const openNewTask = useUI((s) => s.openNewTask);
  const toast = useUI((s) => s.toast);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    touchRecent(project.id);
  }, [project.id, touchRecent]);

  // support deep links like /app/projects/{id}?task={taskId} (copy-link)
  const openTaskPanel = useUI((s) => s.openTask);
  const linkedTaskId = searchParams.get("task");
  useEffect(() => {
    if (linkedTaskId) openTaskPanel(linkedTaskId);
  }, [linkedTaskId, openTaskPanel]);

  const isFav = favorites.projects.includes(project.id);
  const progress = projectProgress(tasks, project);
  const members = users.filter((u) => project.memberIds.includes(u.id));
  const openCount = tasks.filter((t) => t.projectId === project.id && !t.completedAt && !t.archived && !t.parentId).length;

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="shrink-0 px-5 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg" style={{ backgroundColor: `${project.color}25` }}>
            <Icon name={project.icon} size={20} style={{ color: project.color }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight">{project.name}</h1>
              <button
                onClick={() => toggleFavorite("projects", project.id)}
                className={cn("flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer", isFav ? "text-amber-300" : "text-white/30 hover:text-amber-300")}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Icon name={isFav ? "mingcute:star-fill" : "mingcute:star-line"} size={16} />
              </button>
            </div>
            <p className="truncate text-xs text-white/45">{project.description || "No description"}</p>
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="w-32">
              <div className="mb-1 flex justify-between text-[10px] text-white/40">
                <span>{openCount} open</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} color={project.color} height={5} />
            </div>
            <AvatarStack users={members} size={26} />
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => openNewTask({ projectId: project.id })}
            className="accent-gradient flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)] hover:brightness-110 transition-all cursor-pointer"
          >
            <Icon name="mingcute:add-line" size={14} />
            Task
          </motion.button>

          <Popover
            width={220}
            trigger={
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
                <Icon name="mingcute:more-2-line" size={17} />
              </button>
            }
            align="end"
          >
            <MenuList>
              <MenuItem icon="mingcute:settings-3-line" label="Project settings" onClick={() => setSettingsOpen(true)} />
              <MenuItem
                icon="mingcute:star-line"
                label={isFav ? "Remove from favorites" : "Add to favorites"}
                onClick={() => toggleFavorite("projects", project.id)}
              />
              <MenuItem
                icon="mingcute:archive-line"
                label="Archive project"
                onClick={() => {
                  updateProject(project.id, { archived: true });
                  toast("Project archived", { icon: "mingcute:archive-line", kind: "info" });
                  router.push("/app/home");
                }}
              />
              <MenuSeparator />
              <MenuItem icon="mingcute:delete-2-line" label="Delete project" danger onClick={() => setConfirmDelete(true)} />
            </MenuList>
          </Popover>
        </div>

        {/* view tabs */}
        <div className="mt-3 flex items-center gap-0.5 overflow-x-auto border-b border-white/8 pb-0">
          {project.views.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "relative flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-medium transition-colors cursor-pointer",
                view === v ? "text-white" : "text-white/45 hover:text-white/80"
              )}
            >
              <Icon name={viewMeta[v].icon} size={14} className={view === v ? "text-indigo-300" : ""} />
              {viewMeta[v].label}
              {view === v && (
                <motion.span
                  layoutId={`view-tab-${project.id}`}
                  transition={{ type: "spring", stiffness: 480, damping: 36 }}
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full accent-gradient"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* active view */}
      <div className="min-h-0 flex-1 overflow-hidden px-3 pt-3 pb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.7 }}
            className="h-full min-h-0"
          >
            {view === "overview" && <OverviewView project={project} />}
            {view === "list" && <ListView project={project} />}
            {view === "board" && <BoardView project={project} />}
            {view === "table" && <TableView project={project} />}
            {view === "calendar" && <CalendarView project={project} />}
            {view === "gantt" && <GanttView project={project} />}
            {view === "workload" && <WorkloadView project={project} />}
            {view === "activity" && <ActivityView project={project} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <ProjectSettingsModal project={project} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteProject(project.id);
          toast("Project deleted", { kind: "info", icon: "mingcute:delete-2-line" });
          router.push("/app/home");
        }}
        title={`Delete “${project.name}”?`}
        body="All tasks, comments and automations in this project will be permanently deleted."
      />
    </div>
  );
}

function ProjectPageInner() {
  const searchParams = useSearchParams();
  const projects = useStore((s) => s.projects);
  const hydrated = useStore((s) => s.hydrated);
  const project = projects.find((p) => p.id === searchParams.get("id"));

  if (!project) {
    if (!hydrated) return null;
    return (
      <div className="glass flex h-full items-center justify-center rounded-2xl">
        <EmptyState icon="mingcute:folder-delete-line" title="Project not found" body="It may have been deleted, or the link is wrong." />
      </div>
    );
  }

  return <ProjectViews project={project} />;
}

export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectPageInner />
    </Suspense>
  );
}
