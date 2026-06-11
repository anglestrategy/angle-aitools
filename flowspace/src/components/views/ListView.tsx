"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { applyFilters, groupTasks, type TaskGroup } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { ID, Priority, Project, Task, ViewState } from "@/lib/types";
import { useUI } from "@/lib/uiStore";
import { cn, dueState, dueStateColor, formatDate, isDone } from "@/lib/utils";
import {
  AssigneePicker,
  DatePicker,
  PriorityFlag,
  PriorityPicker,
  StatusPicker,
  TagChips,
  TagPicker,
} from "@/components/fields/pickers";
import { ConfirmDialog, MenuItem, MenuLabel, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";
import {
  AvatarStack,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Icon,
  ProgressBar,
  StatusDot,
} from "@/components/ui/primitives";
import { ViewToolbar, useViewState } from "./ViewToolbar";

const spring = { type: "spring" as const, stiffness: 380, damping: 30 };

/** sensible defaults for quick-added tasks based on the group they were added to */
function quickAddDefaults(group: TaskGroup): Partial<Task> {
  if (group.statusId) return { statusId: group.statusId };
  const [kind, val] = group.key.split(":");
  if (kind === "assignee" && val && val !== "none") return { assigneeIds: [val] };
  if (kind === "priority" && val) return { priority: val as Priority };
  if (kind === "tag" && val && val !== "none") return { tagIds: [val] };
  return {};
}

// ─── ListView ────────────────────────────────────────────────────────────────

export function ListView({ project }: { project: Project }) {
  const [vs, patch] = useViewState(project.id);
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const comments = useStore((s) => s.comments);
  const openNewTask = useUI((s) => s.openNewTask);

  const filtered = useMemo(() => applyFilters(tasks, project, vs), [tasks, project, vs]);
  const groups = useMemo(
    () => groupTasks(filtered, project, vs, users, tags),
    [filtered, project, vs, users, tags]
  );
  const commentCounts = useMemo(() => {
    const m = new Map<ID, number>();
    for (const c of comments) m.set(c.taskId, (m.get(c.taskId) ?? 0) + 1);
    return m;
  }, [comments]);

  const toggleCollapse = (key: string) =>
    patch({
      collapsedGroups: vs.collapsedGroups.includes(key)
        ? vs.collapsedGroups.filter((k) => k !== key)
        : [...vs.collapsedGroups, key],
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar project={project} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-10 pr-1">
        {filtered.length === 0 ? (
          <EmptyState
            icon="mingcute:list-check-line"
            title="No tasks here"
            body="Create your first task, or loosen the filters to see more."
            action={
              <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => openNewTask({ projectId: project.id })}>
                New task
              </Button>
            }
          />
        ) : (
          groups.map((g) => (
            <GroupSection
              key={g.key}
              group={g}
              project={project}
              vs={vs}
              allTasks={tasks}
              commentCounts={commentCounts}
              collapsed={vs.collapsedGroups.includes(g.key)}
              onToggleCollapse={() => toggleCollapse(g.key)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Group section ──────────────────────────────────────────────────────────

function GroupSection({
  group,
  project,
  vs,
  allTasks,
  commentCounts,
  collapsed,
  onToggleCollapse,
}: {
  group: TaskGroup;
  project: Project;
  vs: ViewState;
  allTasks: Task[];
  commentCounts: Map<ID, number>;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const createTask = useStore((s) => s.createTask);
  const setTaskOrder = useStore((s) => s.setTaskOrder);
  const [quickAdd, setQuickAdd] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const manual = vs.sortBy === "manual";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    setDragActive(false);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = group.tasks.map((t) => t.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(group.tasks, oldIndex, newIndex);
    const before = reordered[newIndex - 1];
    const after = reordered[newIndex + 1];
    const dir = vs.sortDir === "asc" ? 1 : -1;
    let order: number;
    if (before && after) order = (before.order + after.order) / 2;
    else if (after) order = after.order - 1000 * dir;
    else if (before) order = before.order + 1000 * dir;
    else return;
    setTaskOrder(String(active.id), order);
  };

  return (
    <section className="mb-1.5">
      {/* group header */}
      <div
        className="group/header flex cursor-pointer select-none items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/4"
        onClick={onToggleCollapse}
      >
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={spring}
          className="flex h-5 w-5 items-center justify-center rounded-md text-white/40"
        >
          <Icon name="mingcute:down-line" size={15} />
        </motion.span>
        <Badge color={group.color}>
          {group.icon ? <Icon name={group.icon} size={11} /> : <StatusDot color={group.color} size={6} />}
          <span className="text-[10px] font-semibold uppercase tracking-wide">{group.label}</span>
        </Badge>
        <span className="text-[11px] font-medium text-white/35">{group.tasks.length}</span>
        <span className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setQuickAdd(true);
            if (collapsed) onToggleCollapse();
          }}
          title="Add task to this group"
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-white/40 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover/header:opacity-100"
        >
          <Icon name="mingcute:add-line" size={14} />
        </button>
      </div>

      {/* group body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
            className="overflow-hidden"
          >
            <div className="ml-6 pb-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragStart={() => setDragActive(true)}
                onDragCancel={() => setDragActive(false)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={group.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence initial={false}>
                    {group.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        project={project}
                        vs={vs}
                        allTasks={allTasks}
                        commentCount={commentCounts.get(t.id) ?? 0}
                        manual={manual}
                        dragActive={dragActive}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
              {group.tasks.length === 0 && !quickAdd && (
                <div className="px-2 py-2 text-xs italic text-white/25">No tasks</div>
              )}
              <QuickAddRow
                open={quickAdd}
                onOpen={() => setQuickAdd(true)}
                onClose={() => setQuickAdd(false)}
                onCreate={(title) => createTask({ projectId: project.id, title, ...quickAddDefaults(group) })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Quick add row ──────────────────────────────────────────────────────────

function QuickAddRow({
  open,
  onOpen,
  onClose,
  onCreate,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  if (!open) {
    return (
      <button
        onClick={onOpen}
        className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-white/30 transition-colors hover:bg-white/4 hover:text-white/70"
      >
        <Icon name="mingcute:add-line" size={13} />
        Add task
      </button>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mr-1 flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-white/4 px-2.5 py-1.5"
    >
      <span className="h-[14px] w-[14px] shrink-0 rounded-[4px] border border-white/20" />
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onCreate(title.trim());
            setTitle("");
          } else if (e.key === "Escape") {
            setTitle("");
            onClose();
          }
        }}
        onBlur={() => {
          if (!title.trim()) onClose();
        }}
        placeholder="Task name, press Enter to add…"
        className="h-6 min-w-0 flex-1 bg-transparent text-[13px] text-white/90 outline-none placeholder:text-white/30"
      />
      <span className="hidden text-[10px] text-white/25 sm:block">Esc to close</span>
    </motion.div>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  project,
  vs,
  allTasks,
  commentCount,
  manual,
  dragActive,
}: {
  task: Task;
  project: Project;
  vs: ViewState;
  allTasks: Task[];
  commentCount: number;
  manual: boolean;
  dragActive: boolean;
}) {
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const updateTask = useStore((s) => s.updateTask);
  const moveTaskToStatus = useStore((s) => s.moveTaskToStatus);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const openTask = useUI((s) => s.openTask);

  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !manual,
  });

  const done = isDone(task, project.statuses);
  const subtasks = useMemo(
    () => allTasks.filter((t) => t.parentId === task.id && !t.archived),
    [allTasks, task.id]
  );
  const doneSubs = subtasks.filter((s) => isDone(s, project.statuses)).length;
  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));
  const ds = dueState(task.dueDate, done);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-30")}
    >
      <motion.div
        layout={!dragActive}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16 } }}
        transition={spring}
        onClick={() => openTask(task.id)}
        className={cn(
          "group/row relative flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-[7px] transition-colors",
          isDragging ? "glass-soft border-indigo-400/30 shadow-2xl" : "hover:bg-white/5",
          done && "opacity-55"
        )}
      >
        {manual && (
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder"
            className="absolute -left-5 top-1/2 flex h-5 w-4 -translate-y-1/2 cursor-grab items-center justify-center text-white/25 opacity-0 transition-opacity active:cursor-grabbing group-hover/row:opacity-100"
          >
            <Icon name="mingcute:menu-line" size={13} />
          </span>
        )}

        <Checkbox size="sm" checked={done} onChange={() => toggleTaskComplete(task.id)} />

        <span
          className={cn(
            "min-w-0 truncate text-[13px] font-medium text-white/90",
            done && "text-white/45 line-through"
          )}
        >
          {task.title}
        </span>

        {subtasks.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            title={expanded ? "Hide subtasks" : "Show subtasks"}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-white/6 px-1.5 py-0.5 text-[10px] font-medium text-white/55 transition-colors hover:bg-white/12 hover:text-white"
          >
            <Icon name="mingcute:git-merge-line" size={11} />
            {doneSubs}/{subtasks.length}
            <span className="w-7">
              <ProgressBar value={(doneSubs / subtasks.length) * 100} height={3} color="#34d399" />
            </span>
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={spring} className="flex items-center">
              <Icon name="mingcute:down-line" size={11} />
            </motion.span>
          </button>
        )}

        <span className="min-w-2 flex-1" />

        {/* inline controls */}
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {task.tagIds.length > 0 && (
            <TagPicker value={task.tagIds} onChange={(ids) => updateTask(task.id, { tagIds: ids })}>
              <button className="cursor-pointer" title="Edit tags">
                <TagChips tagIds={task.tagIds} tags={tags} max={2} size="sm" />
              </button>
            </TagPicker>
          )}

          {commentCount > 0 && (
            <span className="flex items-center gap-1 px-1 text-[11px] text-white/40" title={`${commentCount} comments`}>
              <Icon name="mingcute:chat-2-line" size={13} />
              {commentCount}
            </span>
          )}

          {task.estimateHours != null && (
            <span className="flex items-center gap-1 px-1 text-[11px] text-white/40" title="Time estimate">
              <Icon name="mingcute:time-line" size={13} />
              {task.estimateHours}h
            </span>
          )}

          <DatePicker value={task.dueDate} onChange={(d) => updateTask(task.id, { dueDate: d })}>
            <button
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-white/8",
                task.dueDate ? dueStateColor[ds] : "text-white/30 opacity-0 group-hover/row:opacity-100"
              )}
              title="Due date"
            >
              <Icon name="mingcute:calendar-line" size={13} />
              {task.dueDate ? formatDate(task.dueDate) : "Due"}
            </button>
          </DatePicker>

          <PriorityPicker value={task.priority} onChange={(p) => updateTask(task.id, { priority: p })}>
            <button
              className={cn(
                "flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white/8",
                task.priority === "none" && "opacity-0 group-hover/row:opacity-100"
              )}
              title="Priority"
            >
              {task.priority === "none" ? (
                <Icon name="mingcute:flag-2-line" size={14} className="text-white/30" />
              ) : (
                <PriorityFlag priority={task.priority} />
              )}
            </button>
          </PriorityPicker>

          {vs.groupBy !== "status" && (
            <StatusPicker project={project} value={task.statusId} onChange={(sid) => moveTaskToStatus(task.id, sid)} />
          )}

          <AssigneePicker
            value={task.assigneeIds}
            onChange={(ids) => updateTask(task.id, { assigneeIds: ids })}
            memberIds={project.memberIds}
          >
            {assignees.length ? (
              <button className="cursor-pointer" title="Assignees">
                <AvatarStack users={assignees} size={22} max={3} />
              </button>
            ) : (
              <button
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-white/25 text-white/35 opacity-0 transition-all hover:border-white/50 hover:text-white group-hover/row:opacity-100"
                title="Assign"
              >
                <Icon name="mingcute:user-add-line" size={12} />
              </button>
            )}
          </AssigneePicker>

          <RowMenu task={task} project={project} />
        </div>
      </motion.div>

      {/* expanded subtasks */}
      <AnimatePresence initial={false}>
        {expanded && subtasks.length > 0 && (
          <motion.div
            key="subtasks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32, mass: 0.8 }}
            className="overflow-hidden"
          >
            <div className="ml-[26px] border-l border-white/8 py-0.5 pl-2">
              {subtasks.map((st) => (
                <SubtaskRow key={st.id} task={st} project={project} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Subtask row ─────────────────────────────────────────────────────────────

function SubtaskRow({ task, project }: { task: Task; project: Project }) {
  const users = useStore((s) => s.users);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const openTask = useUI((s) => s.openTask);
  const done = isDone(task, project.statuses);
  const ds = dueState(task.dueDate, done);
  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));

  return (
    <div
      onClick={() => openTask(task.id)}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/5",
        done && "opacity-55"
      )}
    >
      <Checkbox size="sm" checked={done} onChange={() => toggleTaskComplete(task.id)} />
      <span className={cn("min-w-0 flex-1 truncate text-xs text-white/80", done && "text-white/40 line-through")}>
        {task.title}
      </span>
      {task.dueDate && <span className={cn("text-[10px]", dueStateColor[ds])}>{formatDate(task.dueDate)}</span>}
      {assignees.length > 0 && <AvatarStack users={assignees} size={18} max={2} />}
      <PriorityFlag priority={task.priority} size={12} />
    </div>
  );
}

// ─── Row context menu ────────────────────────────────────────────────────────

function RowMenu({ task, project }: { task: Task; project: Project }) {
  const projects = useStore((s) => s.projects);
  const duplicateTask = useStore((s) => s.duplicateTask);
  const moveTaskToProject = useStore((s) => s.moveTaskToProject);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const others = projects.filter((p) => p.id !== project.id && !p.archived);

  return (
    <>
      <Popover
        width={212}
        align="end"
        open={menuOpen}
        onOpenChange={setMenuOpen}
        trigger={
          <button
            title="More actions"
            className={cn(
              "flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-white/45 transition-all hover:bg-white/10 hover:text-white",
              menuOpen ? "bg-white/10 opacity-100" : "opacity-0 group-hover/row:opacity-100"
            )}
          >
            <Icon name="mingcute:more-2-line" size={15} />
          </button>
        }
      >
        <MenuList>
          <MenuItem icon="mingcute:eye-2-line" label="Open" onClick={() => openTask(task.id)} />
          <MenuItem
            icon="mingcute:copy-2-line"
            label="Duplicate"
            onClick={() => {
              duplicateTask(task.id);
              toast("Task duplicated", { icon: "mingcute:copy-2-line" });
            }}
          />
          <MenuItem
            icon="mingcute:link-2-line"
            label="Copy link"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/app/projects/${project.id}?task=${task.id}`);
              toast("Link copied to clipboard", { icon: "mingcute:link-2-line", kind: "info" });
            }}
          />
          {others.length > 0 && (
            <Popover
              side="right"
              align="start"
              width={224}
              triggerClassName="w-full"
              trigger={
                <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-white/80 transition-colors hover:bg-white/8 hover:text-white">
                  <Icon name="mingcute:transfer-line" size={15} className="text-white/50" />
                  <span className="flex-1 truncate">Move to project</span>
                  <Icon name="mingcute:right-line" size={13} className="text-white/35" />
                </button>
              }
            >
              {/* keep the parent menu open while interacting with the submenu */}
              <div onMouseDown={(e) => e.stopPropagation()}>
                <MenuList>
                  <MenuLabel>Move to</MenuLabel>
                  {others.map((p) => (
                    <MenuItem
                      key={p.id}
                      icon={p.icon}
                      color={p.color}
                      label={p.name}
                      onClick={() => {
                        moveTaskToProject(task.id, p.id);
                        setMenuOpen(false);
                        toast(`Moved to ${p.name}`, { icon: "mingcute:transfer-line" });
                      }}
                    />
                  ))}
                </MenuList>
              </div>
            </Popover>
          )}
          <MenuItem
            icon="mingcute:archive-line"
            label="Archive"
            onClick={() => {
              updateTask(task.id, { archived: true });
              toast("Task archived", { icon: "mingcute:archive-line", kind: "info" });
            }}
          />
          <MenuSeparator />
          <MenuItem icon="mingcute:delete-2-line" label="Delete" danger onClick={() => setConfirmDelete(true)} />
        </MenuList>
      </Popover>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteTask(task.id);
          toast("Task deleted", { icon: "mingcute:delete-2-line", kind: "info" });
        }}
        title={`Delete “${task.title}”?`}
        body="This will also delete its subtasks, comments and time entries. This cannot be undone."
      />
    </>
  );
}
