"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ID, Priority, Project, Task, ViewState } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { applyFilters, groupTasks, type TaskGroup } from "@/lib/selectors";
import { cn, dueState, dueStateColor, formatDate, isDone, timeAgo } from "@/lib/utils";
import { AvatarStack, EmptyState, Icon, StatusDot } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuLabel, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";
import { PriorityFlag, TagChips } from "@/components/fields/pickers";
import { ViewToolbar, useViewState } from "@/components/views/ViewToolbar";

/** separator for composite dnd ids — a task may appear in several columns (e.g. multi-assignee) */
const SEP = "::";
const colId = (groupKey: string) => `col${SEP}${groupKey}`;
const cardId = (groupKey: string, taskId: ID) => `${groupKey}${SEP}card${SEP}${taskId}`;

function parseDndId(id: string): { kind: "col"; groupKey: string } | { kind: "card"; groupKey: string; taskId: ID } | null {
  if (id.startsWith(`col${SEP}`)) return { kind: "col", groupKey: id.slice(5) };
  const i = id.indexOf(`${SEP}card${SEP}`);
  if (i === -1) return null;
  return { kind: "card", groupKey: id.slice(0, i), taskId: id.slice(i + 8) };
}

const STATUS_COLORS = ["#94a3b8", "#38bdf8", "#6366f1", "#a855f7", "#ec4899", "#fb7185", "#fbbf24", "#34d399"];

/** fractional order so the task lands between its displayed neighbors when manually sorted */
function orderBetween(prev: Task | undefined, next: Task | undefined, dir: "asc" | "desc"): number {
  const sign = dir === "asc" ? 1 : -1;
  if (prev && next) return (prev.order + next.order) / 2;
  if (prev) return prev.order + 1000 * sign;
  if (next) return next.order - 1000 * sign;
  return Date.now();
}

// ─── Task card ───────────────────────────────────────────────────────────────

function TaskCardInner({
  task,
  project,
  overlay,
  onDelete,
}: {
  task: Task;
  project: Project;
  overlay?: boolean;
  onDelete?: () => void;
}) {
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const comments = useStore((s) => s.comments);
  const allTasks = useStore((s) => s.tasks);
  const duplicateTask = useStore((s) => s.duplicateTask);
  const updateTask = useStore((s) => s.updateTask);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);

  const done = isDone(task, project.statuses);
  const ds = dueState(task.dueDate, !!task.completedAt);
  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));
  const commentCount = comments.filter((c) => c.taskId === task.id).length;
  const subtasks = allTasks.filter((t) => t.parentId === task.id && !t.archived);
  const subDone = subtasks.filter((t) => isDone(t, project.statuses)).length;
  const checkDone = task.checklist.filter((c) => c.done).length;

  const chip = "inline-flex items-center gap-1 rounded-md bg-white/6 px-1.5 py-0.5 text-[10px] font-medium text-white/55";

  return (
    <motion.div
      whileHover={overlay ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      onClick={() => !overlay && openTask(task.id)}
      className={cn(
        "group/card glass-card relative cursor-pointer select-none overflow-hidden !rounded-xl",
        done && "opacity-55",
        overlay && "drag-overlay-card"
      )}
    >
      {task.coverGradient && <div className="h-9 w-full" style={{ background: task.coverGradient }} />}
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          <p className={cn("min-w-0 flex-1 text-[13px] font-medium leading-snug text-white/90", done && "text-white/45 line-through")}>
            {task.title}
          </p>
          {!overlay && (
            <div
              className="-mr-1.5 -mt-1.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover/card:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Popover
                width={180}
                align="end"
                trigger={
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label="Task actions"
                  >
                    <Icon name="mingcute:more-1-line" size={14} />
                  </button>
                }
              >
                <MenuList>
                  <MenuItem
                    icon="mingcute:copy-2-line"
                    label="Duplicate"
                    onClick={() => {
                      duplicateTask(task.id);
                      toast("Task duplicated", { icon: "mingcute:copy-2-line" });
                    }}
                  />
                  <MenuItem
                    icon="mingcute:archive-line"
                    label="Archive"
                    onClick={() => {
                      updateTask(task.id, { archived: true });
                      toast("Task archived", { icon: "mingcute:archive-line", kind: "info" });
                    }}
                  />
                  <MenuSeparator />
                  <MenuItem icon="mingcute:delete-2-line" label="Delete" danger onClick={() => onDelete?.()} />
                </MenuList>
              </Popover>
            </div>
          )}
        </div>

        {(task.priority !== "none" || task.dueDate || task.tagIds.length > 0 || subtasks.length > 0 || task.checklist.length > 0 || task.estimateHours || commentCount > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityFlag priority={task.priority} size={13} />
            {task.dueDate && (
              <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", dueStateColor[ds])}>
                <Icon name="mingcute:calendar-line" size={12} />
                {formatDate(task.dueDate)}
              </span>
            )}
            <TagChips tagIds={task.tagIds} tags={tags} max={2} size="sm" />
            {subtasks.length > 0 && (
              <span className={cn(chip, subDone === subtasks.length && "text-emerald-300/80")}>
                <Icon name="mingcute:git-merge-line" size={11} />
                {subDone}/{subtasks.length}
              </span>
            )}
            {task.checklist.length > 0 && (
              <span className={cn(chip, checkDone === task.checklist.length && "text-emerald-300/80")}>
                <Icon name="mingcute:checkbox-line" size={11} />
                {checkDone}/{task.checklist.length}
              </span>
            )}
            {task.estimateHours != null && (
              <span className={chip}>
                <Icon name="mingcute:time-line" size={11} />
                {task.estimateHours}h
              </span>
            )}
            {commentCount > 0 && (
              <span className={chip}>
                <Icon name="mingcute:message-2-line" size={11} />
                {commentCount}
              </span>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          {assignees.length > 0 ? (
            <AvatarStack users={assignees} size={20} max={3} />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-white/20 text-white/25">
              <Icon name="mingcute:user-3-line" size={10} />
            </span>
          )}
          <span className="text-[10px] text-white/30">{timeAgo(task.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function SortableCard({
  task,
  groupKey,
  project,
  onDelete,
}: {
  task: Task;
  groupKey: string;
  project: Project;
  onDelete: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cardId(groupKey, task.id) });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-30")}
    >
      <TaskCardInner task={task} project={project} onDelete={() => onDelete(task)} />
    </div>
  );
}

// ─── Quick add ───────────────────────────────────────────────────────────────

function QuickAdd({ onSubmit, onClose }: { onSubmit: (title: string) => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 460, damping: 30 }}
      className="glass-card !rounded-xl p-2"
    >
      <textarea
        ref={ref}
        autoFocus
        rows={2}
        value={value}
        placeholder="Task title… (Enter to add)"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const title = value.trim();
            if (title) {
              onSubmit(title);
              setValue("");
              ref.current?.focus();
            }
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
        onBlur={() => {
          if (!value.trim()) onClose();
        }}
        className="w-full resize-none bg-transparent text-[13px] text-white/90 placeholder:text-white/30 outline-none"
      />
      <div className="flex items-center justify-between px-0.5 text-[10px] text-white/30">
        <span>Enter to add · Esc to close</span>
        <Icon name="mingcute:add-circle-line" size={13} className="text-indigo-300/70" />
      </div>
    </motion.div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function BoardColumn({
  project,
  group,
  vs,
  statusGrouped,
  onRequestDeleteTask,
}: {
  project: Project;
  group: TaskGroup;
  vs: ViewState;
  statusGrouped: boolean;
  onRequestDeleteTask: (task: Task) => void;
}) {
  const createTask = useStore((s) => s.createTask);
  const addStatus = useStore((s) => s.addStatus);
  const updateStatus = useStore((s) => s.updateStatus);
  const deleteStatus = useStore((s) => s.deleteStatus);
  const toast = useUI((s) => s.toast);

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(group.label);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: colId(group.key) });

  const quickCreate = (title: string) => {
    const data: Partial<Task> & { projectId: ID; title: string } = { projectId: project.id, title };
    if (group.statusId) data.statusId = group.statusId;
    else if (group.key.startsWith("assignee:") && group.key !== "assignee:none") data.assigneeIds = [group.key.slice(9)];
    else if (group.key.startsWith("priority:")) data.priority = group.key.slice(9) as Priority;
    else if (group.key.startsWith("tag:") && group.key !== "tag:none") data.tagIds = [group.key.slice(4)];
    createTask(data);
  };

  const commitRename = () => {
    const name = renameValue.trim();
    if (group.statusId && name && name !== group.label) updateStatus(project.id, group.statusId, { name });
    setRenaming(false);
  };

  const addStatusRight = () => {
    const current = project.statuses.find((s) => s.id === group.statusId);
    if (!current) return;
    addStatus(project.id, "New status", STATUS_COLORS[project.statuses.length % STATUS_COLORS.length], "active");
    const fresh = useStore.getState().projects.find((p) => p.id === project.id);
    const created = fresh?.statuses[fresh.statuses.length - 1];
    if (!created) return;
    const next = [...project.statuses].sort((a, b) => a.order - b.order).find((s) => s.order > current.order);
    updateStatus(project.id, created.id, { order: next ? (current.order + next.order) / 2 : current.order + 1 });
  };

  return (
    <div className="glass-soft flex h-full w-[300px] shrink-0 flex-col rounded-2xl">
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <StatusDot color={group.color} size={9} />
        {renaming && group.statusId ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="input-glass h-6 min-w-0 flex-1 px-1.5 text-xs font-semibold"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-white/80">{group.label}</span>
        )}
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/8 px-1.5 text-[10px] font-semibold text-white/50">
          {group.tasks.length}
        </span>
        <button
          onClick={() => setAdding(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          title="Add task"
        >
          <Icon name="mingcute:add-line" size={14} />
        </button>
        {statusGrouped && group.statusId && (
          <Popover
            width={196}
            align="end"
            trigger={
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                title="Column options"
              >
                <Icon name="mingcute:more-1-line" size={14} />
              </button>
            }
          >
            <MenuList>
              <MenuItem
                icon="mingcute:edit-2-line"
                label="Rename status"
                onClick={() => {
                  setRenameValue(group.label);
                  setRenaming(true);
                }}
              />
              <MenuLabel>Set color</MenuLabel>
              <div className="grid grid-cols-8 gap-1 px-2.5 pb-1.5">
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateStatus(project.id, group.statusId!, { color: c })}
                    className={cn(
                      "h-4 w-4 rounded-full transition-transform hover:scale-125 cursor-pointer",
                      group.color === c && "ring-2 ring-white/60 ring-offset-1 ring-offset-transparent"
                    )}
                    style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}70` }}
                    title={c}
                  />
                ))}
              </div>
              <MenuSeparator />
              <MenuItem icon="mingcute:layout-rightbar-open-line" label="Add status right" onClick={addStatusRight} />
              {project.statuses.length > 1 && (
                <MenuItem icon="mingcute:delete-2-line" label="Delete status" danger onClick={() => setConfirmDelete(true)} />
              )}
            </MenuList>
          </Popover>
        )}
      </div>

      {/* body */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 space-y-2 overflow-y-auto rounded-b-2xl px-2 pb-2 transition-colors duration-150",
          isOver && "bg-indigo-500/8"
        )}
      >
        <SortableContext items={group.tasks.map((t) => cardId(group.key, t.id))} strategy={verticalListSortingStrategy}>
          {group.tasks.map((t) => (
            <SortableCard key={t.id} task={t} groupKey={group.key} project={project} onDelete={onRequestDeleteTask} />
          ))}
        </SortableContext>

        {group.tasks.length === 0 && !adding && (
          <div
            className={cn(
              "flex h-24 items-center justify-center rounded-xl border border-dashed text-[11px] transition-colors duration-150",
              isOver ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-200/80" : "border-white/12 text-white/25"
            )}
          >
            Drop tasks here
          </div>
        )}

        {adding ? (
          <QuickAdd
            onSubmit={(title) => {
              quickCreate(title);
              toast("Task created", { icon: "mingcute:add-circle-line" });
            }}
            onClose={() => setAdding(false)}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-white/40 transition-colors hover:bg-white/6 hover:text-white/80 cursor-pointer"
          >
            <Icon name="mingcute:add-line" size={14} />
            Add task
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (group.statusId) {
            deleteStatus(project.id, group.statusId);
            toast("Status deleted", { kind: "info", icon: "mingcute:delete-2-line" });
          }
        }}
        title={`Delete “${group.label}”?`}
        body={
          vs.showCompleted
            ? "Tasks in this column will be moved to the first remaining status."
            : "Tasks in this column (including hidden ones) will be moved to the first remaining status."
        }
      />
    </div>
  );
}

// ─── Add-column affordance ───────────────────────────────────────────────────

function AddColumn({ project }: { project: Project }) {
  const addStatus = useStore((s) => s.addStatus);
  const toast = useUI((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = () => {
    const n = name.trim();
    if (n) {
      addStatus(project.id, n, STATUS_COLORS[project.statuses.length % STATUS_COLORS.length], "active");
      toast("Status added", { icon: "mingcute:add-circle-line" });
    }
    setName("");
    setOpen(false);
  };

  if (open) {
    return (
      <div className="glass-soft h-fit w-[260px] shrink-0 rounded-2xl p-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={create}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
            if (e.key === "Escape") {
              setName("");
              setOpen(false);
            }
          }}
          placeholder="Status name…"
          className="input-glass h-8 w-full px-2.5 text-xs"
        />
      </div>
    );
  }
  return (
    <button
      onClick={() => setOpen(true)}
      className="flex h-11 w-[260px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/12 text-xs font-medium text-white/35 transition-colors hover:border-white/25 hover:bg-white/4 hover:text-white/75 cursor-pointer"
    >
      <Icon name="mingcute:add-line" size={15} />
      Add status
    </button>
  );
}

// ─── Board ───────────────────────────────────────────────────────────────────

export function BoardView({ project }: { project: Project }) {
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const moveTaskToStatus = useStore((s) => s.moveTaskToStatus);
  const setTaskOrder = useStore((s) => s.setTaskOrder);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const openNewTask = useUI((s) => s.openNewTask);
  const toast = useUI((s) => s.toast);

  const [vs] = useViewState(project.id);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const filtered = useMemo(() => applyFilters(tasks, project, vs), [tasks, project, vs]);
  const groups = useMemo(() => groupTasks(filtered, project, vs, users, tags), [filtered, project, vs, users, tags]);

  const statusGrouped = vs.groupBy === "status";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragStart = (e: DragStartEvent) => {
    const parsed = parseDndId(String(e.active.id));
    if (parsed?.kind === "card") setActiveTask(filtered.find((t) => t.id === parsed.taskId) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const from = parseDndId(String(e.active.id));
    if (!e.over || from?.kind !== "card") return;
    const to = parseDndId(String(e.over.id));
    if (!to) return;

    const sourceGroup = groups.find((g) => g.key === from.groupKey);
    const targetGroup = groups.find((g) => g.key === to.groupKey);
    const task = filtered.find((t) => t.id === from.taskId);
    if (!sourceGroup || !targetGroup || !task) return;

    const overTaskId = to.kind === "card" ? to.taskId : null;
    const manual = vs.sortBy === "manual";

    // ── reorder within a column ──
    if (sourceGroup.key === targetGroup.key) {
      if (!manual || !overTaskId || overTaskId === task.id) return;
      const list = targetGroup.tasks;
      const oldIndex = list.findIndex((t) => t.id === task.id);
      const newIndex = list.findIndex((t) => t.id === overTaskId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(list, oldIndex, newIndex);
      const i = reordered.findIndex((t) => t.id === task.id);
      setTaskOrder(task.id, orderBetween(reordered[i - 1], reordered[i + 1], vs.sortDir));
      return;
    }

    // ── move across columns ──
    if (vs.groupBy === "dueDate") return; // dragging between due-date buckets is disabled

    const list = targetGroup.tasks.filter((t) => t.id !== task.id);
    const insertAt = overTaskId ? Math.max(0, list.findIndex((t) => t.id === overTaskId)) : list.length;
    const order = manual ? orderBetween(list[insertAt - 1], list[insertAt], vs.sortDir) : undefined;

    if (statusGrouped && targetGroup.statusId) {
      moveTaskToStatus(task.id, targetGroup.statusId, order);
      return;
    }

    const patch: Partial<Task> = order !== undefined ? { order } : {};
    if (vs.groupBy === "assignee") {
      patch.assigneeIds = targetGroup.key === "assignee:none" ? [] : [targetGroup.key.slice(9)];
    } else if (vs.groupBy === "priority") {
      patch.priority = targetGroup.key.slice(9) as Priority;
    } else if (vs.groupBy === "tag") {
      const tagId = targetGroup.key.slice(4);
      patch.tagIds = targetGroup.key === "tag:none" ? [] : task.tagIds.includes(tagId) ? task.tagIds : [...task.tagIds, tagId];
    } else {
      return;
    }
    updateTask(task.id, patch);
    toast(`Moved to ${targetGroup.label}`, { icon: "mingcute:transfer-line", kind: "info" });
  };

  if (groups.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ViewToolbar project={project} />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="mingcute:columns-3-line"
            title="Nothing on the board"
            body="No tasks match the current filters. Create one to get rolling."
            action={
              <button
                onClick={() => openNewTask({ projectId: project.id })}
                className="accent-gradient flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)] hover:brightness-110 transition-all cursor-pointer"
              >
                <Icon name="mingcute:add-line" size={14} />
                New task
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar project={project} />
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveTask(null)}>
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full items-stretch gap-3 px-1 pb-1">
            {groups.map((g) => (
              <BoardColumn key={g.key} project={project} group={g} vs={vs} statusGrouped={statusGrouped} onRequestDeleteTask={setTaskToDelete} />
            ))}
            {statusGrouped && <AddColumn project={project} />}
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeTask && (
            <div className="w-[284px]">
              <TaskCardInner task={activeTask} project={project} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            toast("Task deleted", { kind: "info", icon: "mingcute:delete-2-line" });
          }
        }}
        title={`Delete “${taskToDelete?.title}”?`}
        body="This will also delete its subtasks, comments and time entries."
      />
    </div>
  );
}
