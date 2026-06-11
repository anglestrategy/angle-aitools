"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { subDays } from "date-fns";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { projectProgress } from "@/lib/selectors";
import type { Project } from "@/lib/types";
import { isDone, pluralize, timeAgo } from "@/lib/utils";
import { AvatarStack, Badge, Button, EmptyState, Icon, IconButton, ProgressBar, SectionLabel } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";
import { AssigneePicker } from "@/components/fields/pickers";

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);

  const projectTasks = tasks.filter((t) => t.projectId === project.id && !t.archived);
  const open = projectTasks.filter((t) => !t.parentId && !isDone(t, project.statuses)).length;
  const progress = projectProgress(tasks, project);
  const members = users.filter((u) => project.memberIds.includes(u.id));
  const lastTouched = projectTasks.reduce<string>((max, t) => (t.updatedAt > max ? t.updatedAt : max), project.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(index * 0.05, 0.35) }}
    >
      <Link href={`/app/project?id=${project.id}`} className="glass-card glass-hover sheen block p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${project.color}1e`, color: project.color }}>
            <Icon name={project.icon} size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white/92">{project.name}</h3>
            <p className="truncate text-[11px] text-white/35">
              {pluralize(open, "open task")} · updated {timeAgo(lastTouched)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={progress} color={project.color} className="flex-1" height={5} />
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: project.color }}>
            {progress}%
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack users={members} size={22} max={4} />
          {project.archived && <Badge size="sm">Archived</Badge>}
        </div>
      </Link>
    </motion.div>
  );
}

function SpaceOverviewInner() {
  const spaceId = useSearchParams().get("id");
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const openNewProject = useUI((s) => s.openNewProject);

  const space = useStore((s) => s.spaces.find((sp) => sp.id === spaceId));
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const docs = useStore((s) => s.docs);
  const users = useStore((s) => s.users);
  const updateSpace = useStore((s) => s.updateSpace);
  const deleteSpace = useStore((s) => s.deleteSpace);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const spaceProjects = useMemo(() => projects.filter((p) => p.spaceId === spaceId).sort((a, b) => a.order - b.order), [projects, spaceId]);
  const spaceDocs = docs.filter((d) => d.spaceId === spaceId);

  const stats = useMemo(() => {
    const weekAgo = subDays(new Date(), 7).toISOString();
    let open = 0;
    let doneWeek = 0;
    for (const p of spaceProjects) {
      for (const t of tasks) {
        if (t.projectId !== p.id || t.archived) continue;
        if (isDone(t, p.statuses)) {
          if (t.completedAt && t.completedAt >= weekAgo) doneWeek++;
        } else open++;
      }
    }
    return { open, doneWeek };
  }, [spaceProjects, tasks]);

  if (!space) {
    return (
      <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
        <EmptyState
          icon="mingcute:box-3-line"
          title="Space not found"
          body="This space may have been deleted."
          className="m-auto"
          action={
            <Button variant="glass" size="sm" icon="mingcute:arrow-left-line" onClick={() => router.push("/app/home")}>
              Back home
            </Button>
          }
        />
      </div>
    );
  }

  const members = users.filter((u) => space.memberIds.includes(u.id));

  const commitName = (el: HTMLInputElement) => {
    const next = el.value.trim();
    if (next && next !== space.name) updateSpace(space.id, { name: next });
    else el.value = space.name;
  };
  const commitDescription = (el: HTMLInputElement) => {
    if (el.value.trim() !== space.description) updateSpace(space.id, { description: el.value.trim() });
  };

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${space.color}1e`, color: space.color, boxShadow: `0 6px 24px ${space.color}30` }}
          >
            <Icon name={space.icon} size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <input
                key={`name-${space.id}-${space.name}`}
                defaultValue={space.name}
                onBlur={(e) => commitName(e.target)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-tight text-white outline-none placeholder:text-white/25"
                placeholder="Space name"
              />
              {space.private && (
                <Badge size="sm">
                  <Icon name="mingcute:lock-line" size={10} />
                  Private
                </Badge>
              )}
              {space.archived && (
                <Badge color="#fbbf24" size="sm">
                  <Icon name="mingcute:archive-line" size={10} />
                  Archived
                </Badge>
              )}
            </div>
            <input
              key={`desc-${space.id}-${space.description}`}
              defaultValue={space.description}
              onBlur={(e) => commitDescription(e.target)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="Add a description…"
              className="mt-0.5 w-full bg-transparent text-xs text-white/50 outline-none placeholder:text-white/25"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AssigneePicker value={space.memberIds} onChange={(ids) => updateSpace(space.id, { memberIds: ids })}>
              <button className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-1 transition-colors hover:bg-white/6" title="Manage members">
                <AvatarStack users={members} size={24} max={5} />
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-white/25 text-white/40">
                  <Icon name="mingcute:user-add-line" size={12} />
                </span>
              </button>
            </AssigneePicker>
            <Popover width={190} align="end" trigger={<IconButton icon="mingcute:more-1-line" label="Space actions" size="sm" />}>
              <MenuList>
                <MenuItem
                  icon="mingcute:archive-line"
                  label={space.archived ? "Unarchive space" : "Archive space"}
                  onClick={() => {
                    updateSpace(space.id, { archived: !space.archived });
                    toast(space.archived ? "Space restored" : "Space archived", { body: space.name, icon: "mingcute:archive-line", kind: "info" });
                  }}
                />
                <MenuSeparator />
                <MenuItem icon="mingcute:delete-2-line" label="Delete space" danger onClick={() => setConfirmDelete(true)} />
              </MenuList>
            </Popover>
          </div>
        </div>

        {/* stats */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="glass-soft flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] text-white/70">
            <Icon name="mingcute:folder-2-line" size={12} className="text-indigo-300" />
            {pluralize(spaceProjects.length, "project")}
          </span>
          <span className="glass-soft flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] text-white/70">
            <Icon name="mingcute:task-2-line" size={12} className="text-sky-300" />
            {pluralize(stats.open, "open task")}
          </span>
          <span className="glass-soft flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] text-emerald-300">
            <Icon name="mingcute:check-circle-line" size={12} />
            {stats.doneWeek} done this week
          </span>
          <span className="glass-soft flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] text-white/70">
            <Icon name="mingcute:group-2-line" size={12} className="text-purple-300" />
            {pluralize(members.length, "member")}
          </span>
        </div>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-3 flex items-center gap-2">
          <SectionLabel>Projects</SectionLabel>
          <div className="h-px flex-1 bg-white/6" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {spaceProjects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(spaceProjects.length * 0.05, 0.4) }}
            onClick={() => openNewProject(space.id)}
            className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-white/45 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/6 hover:text-indigo-200 cursor-pointer"
          >
            <Icon name="mingcute:add-line" size={22} />
            <span className="text-xs font-medium">New project</span>
          </motion.button>
        </div>

        {/* docs */}
        <div className="mb-3 mt-8 flex items-center gap-2">
          <SectionLabel>Docs</SectionLabel>
          <span className="text-[10px] text-white/25">{spaceDocs.length}</span>
          <div className="h-px flex-1 bg-white/6" />
        </div>
        {spaceDocs.length === 0 ? (
          <p className="px-1 text-xs text-white/30">No docs in this space yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {spaceDocs.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Link href={`/app/doc?id=${d.id}`} className="glass-soft glass-hover flex items-center gap-3 rounded-xl px-3.5 py-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={d.coverGradient ? { background: d.coverGradient } : { backgroundColor: "rgba(255,255,255,0.06)" }}
                  >
                    <Icon name={d.icon} size={15} className="text-white/90" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-white/85">{d.title}</span>
                    <span className="block text-[10px] text-white/35">Updated {timeAgo(d.updatedAt)}</span>
                  </span>
                  <Icon name="mingcute:right-line" size={14} className="shrink-0 text-white/25" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${space.name}”?`}
        body={`This deletes the space and its ${pluralize(spaceProjects.length, "project")} with all tasks. Docs are kept and moved to the workspace.`}
        confirmLabel="Delete space"
        onConfirm={() => {
          deleteSpace(space.id);
          toast("Space deleted", { body: space.name, icon: "mingcute:delete-2-line", kind: "info" });
          router.push("/app/home");
        }}
      />
    </div>
  );
}

export default function SpaceOverviewPage() {
  return (
    <Suspense>
      <SpaceOverviewInner />
    </Suspense>
  );
}
