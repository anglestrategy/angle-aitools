"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyFilters, sortTasks } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { CustomFieldDef, ID, Project, SortBy, Task, ViewState } from "@/lib/types";
import { useUI } from "@/lib/uiStore";
import { clamp, cn, dueState, dueStateColor, formatDate, isDone } from "@/lib/utils";
import {
  AssigneePicker,
  DatePicker,
  PriorityPicker,
  StatusPicker,
  TagChips,
  TagPicker,
} from "@/components/fields/pickers";
import { MenuItem, MenuLabel, MenuList, Popover } from "@/components/ui/overlay";
import {
  AvatarStack,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Icon,
  ProgressBar,
} from "@/components/ui/primitives";
import { ViewToolbar, useViewState } from "./ViewToolbar";

// cell style constants -------------------------------------------------------

const TH =
  "sticky top-0 z-20 whitespace-nowrap border-b border-white/10 bg-[#14162b]/95 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40 backdrop-blur-xl select-none";
const TD = "whitespace-nowrap border-b border-white/5 px-3 py-1.5 align-middle";
const TF =
  "sticky bottom-0 z-20 whitespace-nowrap border-t border-white/10 bg-[#14162b]/95 px-3 py-2 text-[11px] text-white/45 backdrop-blur-xl";
const TD_STICKY = "sticky z-10 bg-[#11131f] transition-colors group-hover/tr:bg-[#181a2c]";

// ─── TableView ───────────────────────────────────────────────────────────────

export function TableView({ project }: { project: Project }) {
  const [vs, patch] = useViewState(project.id);
  const tasks = useStore((s) => s.tasks);
  const openNewTask = useUI((s) => s.openNewTask);

  const rows = useMemo(() => sortTasks(applyFilters(tasks, project, vs), vs), [tasks, project, vs]);

  const doneCount = useMemo(
    () => rows.filter((t) => isDone(t, project.statuses)).length,
    [rows, project.statuses]
  );
  const estSum = useMemo(
    () => Math.round(rows.reduce((acc, t) => acc + (t.estimateHours ?? 0), 0) * 10) / 10,
    [rows]
  );
  const pctDone = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar project={project} hideGroupBy />
      <div className="glass-soft min-h-0 flex-1 overflow-auto rounded-xl">
        {rows.length === 0 ? (
          <EmptyState
            icon="mingcute:table-2-line"
            title="No tasks to show"
            body="Create a task or adjust the filters to populate the table."
            action={
              <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => openNewTask({ projectId: project.id })}>
                New task
              </Button>
            }
          />
        ) : (
          <>
            <table className="w-full min-w-max border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={cn(TH, "left-0 z-30 w-10 min-w-10 sticky")} aria-label="Complete" />
                  <th className={cn(TH, "left-10 z-30 min-w-[280px] sticky")}>
                    <SortHeader label="Title" sortKey="title" vs={vs} patch={patch} />
                  </th>
                  <th className={cn(TH, "min-w-[136px]")}>Status</th>
                  <th className={cn(TH, "min-w-[120px]")}>Assignees</th>
                  <th className={cn(TH, "min-w-[116px]")}>
                    <SortHeader label="Priority" sortKey="priority" vs={vs} patch={patch} />
                  </th>
                  <th className={cn(TH, "min-w-[116px]")}>
                    <SortHeader label="Due date" sortKey="dueDate" vs={vs} patch={patch} />
                  </th>
                  <th className={cn(TH, "min-w-[110px]")}>Start date</th>
                  <th className={cn(TH, "min-w-[150px]")}>Tags</th>
                  <th className={cn(TH, "min-w-[90px]")}>Estimate</th>
                  {project.customFields.map((f) => (
                    <th key={f.id} className={cn(TH, "min-w-[132px]")}>
                      <span className="flex items-center gap-1.5">
                        <Icon name={f.icon} size={13} className="text-white/35" />
                        {f.name}
                      </span>
                    </th>
                  ))}
                  <th className={cn(TH, "min-w-[100px]")}>
                    <SortHeader label="Created" sortKey="createdAt" vs={vs} patch={patch} />
                  </th>
                </tr>
              </thead>

              <tbody>
                <AnimatePresence initial={false}>
                  {rows.map((t) => (
                    <TableRow key={t.id} task={t} project={project} />
                  ))}
                </AnimatePresence>
              </tbody>

              <tfoot>
                <tr>
                  <td className={cn(TF, "left-0 z-30 sticky")} />
                  <td className={cn(TF, "left-10 z-30 sticky")}>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-white/70">
                        {rows.length} task{rows.length === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-16">
                          <ProgressBar value={pctDone} height={4} color="#34d399" />
                        </span>
                        {pctDone}% complete
                      </span>
                    </span>
                  </td>
                  <td className={TF} />
                  <td className={TF} />
                  <td className={TF} />
                  <td className={TF} />
                  <td className={TF} />
                  <td className={TF} />
                  <td className={cn(TF, "font-semibold text-white/60")}>{estSum > 0 ? `Σ ${estSum}h` : ""}</td>
                  {project.customFields.map((f) => (
                    <td key={f.id} className={TF}>
                      {footerAggregate(f, rows)}
                    </td>
                  ))}
                  <td className={TF} />
                </tr>
              </tfoot>
            </table>

            <div className="sticky left-0 px-2 py-2">
              <button
                onClick={() => openNewTask({ projectId: project.id })}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/35 transition-colors hover:bg-white/5 hover:text-white/75"
              >
                <Icon name="mingcute:add-line" size={13} />
                New task
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** column aggregates for numeric custom fields */
function footerAggregate(field: CustomFieldDef, rows: Task[]): string {
  if (field.type === "number" || field.type === "currency") {
    const sum = rows.reduce((acc, t) => {
      const v = Number(t.customFieldValues[field.id]);
      return acc + (Number.isFinite(v) ? v : 0);
    }, 0);
    if (!sum) return "";
    const rounded = Math.round(sum * 100) / 100;
    return field.type === "currency" ? `Σ $${rounded.toLocaleString()}` : `Σ ${rounded.toLocaleString()}`;
  }
  if (field.type === "progress") {
    const vals = rows.map((t) => Number(t.customFieldValues[field.id])).filter((v) => Number.isFinite(v));
    if (!vals.length) return "";
    return `Ø ${Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)}%`;
  }
  return "";
}

// ─── Sortable header button ──────────────────────────────────────────────────

function SortHeader({
  label,
  sortKey,
  vs,
  patch,
}: {
  label: string;
  sortKey: SortBy;
  vs: ViewState;
  patch: (p: Partial<ViewState>) => void;
}) {
  const active = vs.sortBy === sortKey;
  return (
    <button
      onClick={() =>
        active ? patch({ sortDir: vs.sortDir === "asc" ? "desc" : "asc" }) : patch({ sortBy: sortKey, sortDir: "asc" })
      }
      title={`Sort by ${label.toLowerCase()}`}
      className={cn(
        "flex cursor-pointer items-center gap-1 uppercase tracking-wider transition-colors",
        active ? "text-indigo-200" : "hover:text-white/75"
      )}
    >
      {label}
      {active && (
        <motion.span initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="flex items-center">
          <Icon name={vs.sortDir === "asc" ? "mingcute:arrow-up-line" : "mingcute:arrow-down-line"} size={12} />
        </motion.span>
      )}
    </button>
  );
}

// ─── Body row ────────────────────────────────────────────────────────────────

function TableRow({ task, project }: { task: Task; project: Project }) {
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const updateTask = useStore((s) => s.updateTask);
  const moveTaskToStatus = useStore((s) => s.moveTaskToStatus);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const openTask = useUI((s) => s.openTask);

  const done = isDone(task, project.statuses);
  const ds = dueState(task.dueDate, done);
  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));

  const [editing, setEditing] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    []
  );

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      className={cn("group/tr transition-colors hover:bg-white/4", done && "opacity-55")}
    >
      {/* complete */}
      <td className={cn(TD, TD_STICKY, "left-0 w-10")}>
        <Checkbox size="sm" checked={done} onChange={() => toggleTaskComplete(task.id)} />
      </td>

      {/* title */}
      <td className={cn(TD, TD_STICKY, "left-10 min-w-[280px] max-w-[440px]")}>
        {editing ? (
          <input
            autoFocus
            defaultValue={task.title}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                e.currentTarget.value = task.title;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== task.title) updateTask(task.id, { title: v });
              setEditing(false);
            }}
            className="input-glass h-7 w-full px-2 text-[13px]"
          />
        ) : (
          <span
            onClick={() => {
              if (clickTimer.current) clearTimeout(clickTimer.current);
              clickTimer.current = setTimeout(() => openTask(task.id), 240);
            }}
            onDoubleClick={() => {
              if (clickTimer.current) clearTimeout(clickTimer.current);
              setEditing(true);
            }}
            title="Click to open · double-click to rename"
            className={cn(
              "block cursor-pointer truncate font-medium text-white/90 transition-colors hover:text-indigo-200",
              done && "text-white/45 line-through"
            )}
          >
            {task.title}
          </span>
        )}
      </td>

      {/* status */}
      <td className={TD}>
        <StatusPicker project={project} value={task.statusId} onChange={(sid) => moveTaskToStatus(task.id, sid)} />
      </td>

      {/* assignees */}
      <td className={TD}>
        <AssigneePicker
          value={task.assigneeIds}
          onChange={(ids) => updateTask(task.id, { assigneeIds: ids })}
          memberIds={project.memberIds}
        >
          {assignees.length ? (
            <button className="cursor-pointer" title="Assignees">
              <AvatarStack users={assignees} size={22} max={3} />
            </button>
          ) : undefined}
        </AssigneePicker>
      </td>

      {/* priority */}
      <td className={TD}>
        <PriorityPicker value={task.priority} onChange={(p) => updateTask(task.id, { priority: p })} />
      </td>

      {/* due date */}
      <td className={TD}>
        <DatePicker value={task.dueDate} onChange={(d) => updateTask(task.id, { dueDate: d })}>
          <button
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/8",
              task.dueDate ? dueStateColor[ds] : "text-white/30"
            )}
          >
            <Icon name="mingcute:calendar-line" size={13} />
            {task.dueDate ? formatDate(task.dueDate) : "—"}
          </button>
        </DatePicker>
      </td>

      {/* start date */}
      <td className={TD}>
        <DatePicker value={task.startDate} onChange={(d) => updateTask(task.id, { startDate: d })} placeholder="Start date">
          <button
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/8",
              task.startDate ? "text-white/65" : "text-white/30"
            )}
          >
            <Icon name="mingcute:calendar-line" size={13} />
            {task.startDate ? formatDate(task.startDate) : "—"}
          </button>
        </DatePicker>
      </td>

      {/* tags */}
      <td className={TD}>
        <TagPicker value={task.tagIds} onChange={(ids) => updateTask(task.id, { tagIds: ids })}>
          {task.tagIds.length ? (
            <button className="cursor-pointer" title="Edit tags">
              <TagChips tagIds={task.tagIds} tags={tags} max={2} size="sm" />
            </button>
          ) : undefined}
        </TagPicker>
      </td>

      {/* estimate */}
      <td className={TD}>
        <InlineNumber
          value={task.estimateHours}
          suffix="h"
          width={48}
          min={0}
          onCommit={(v) => updateTask(task.id, { estimateHours: v })}
        />
      </td>

      {/* custom fields */}
      {project.customFields.map((f) => (
        <td key={f.id} className={TD}>
          <CustomFieldCell task={task} field={f} />
        </td>
      ))}

      {/* created (read-only) */}
      <td className={cn(TD, "text-xs text-white/35")}>{formatDate(task.createdAt)}</td>
    </motion.tr>
  );
}

// ─── Inline editors ──────────────────────────────────────────────────────────

const inlineInputClass =
  "h-7 cursor-text rounded-md border border-transparent bg-transparent px-1.5 text-xs text-white/80 transition-colors hover:border-white/10 hover:bg-white/4 focus:border-indigo-400/50 focus:bg-white/6 focus:outline-none placeholder:text-white/25";

function InlineNumber({
  value,
  onCommit,
  prefix,
  suffix,
  width = 56,
  min,
  max,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  width?: number;
  min?: number;
  max?: number;
}) {
  const commit = (el: HTMLInputElement) => {
    const t = el.value.trim();
    if (t === "") {
      if (value != null) onCommit(null);
      return;
    }
    let n = Number(t);
    if (Number.isNaN(n)) {
      el.value = value == null ? "" : String(value);
      return;
    }
    n = clamp(n, min ?? -Infinity, max ?? Infinity);
    if (n !== value) onCommit(n);
    else el.value = String(n);
  };

  return (
    <span className="inline-flex items-center gap-1">
      {prefix && <span className="text-[11px] text-white/35">{prefix}</span>}
      <input
        // remount on external change so defaultValue stays in sync
        key={value == null ? "empty" : String(value)}
        type="number"
        defaultValue={value ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.currentTarget.value = value == null ? "" : String(value);
            e.currentTarget.blur();
          }
        }}
        onBlur={(e) => commit(e.currentTarget)}
        placeholder="—"
        style={{ width }}
        className={inlineInputClass}
      />
      {suffix && <span className="text-[11px] text-white/35">{suffix}</span>}
    </span>
  );
}

function InlineText({
  value,
  onCommit,
  placeholder = "—",
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      // remount on external change so defaultValue stays in sync
      key={value}
      defaultValue={value}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const v = e.currentTarget.value.trim();
        if (v !== value) onCommit(v);
      }}
      placeholder={placeholder}
      className={cn(inlineInputClass, "w-full min-w-[110px]", className)}
    />
  );
}

// ─── Custom field cell ───────────────────────────────────────────────────────

function CustomFieldCell({ task, field }: { task: Task; field: CustomFieldDef }) {
  const updateTask = useStore((s) => s.updateTask);
  const raw = task.customFieldValues[field.id];
  const setVal = (v: unknown) =>
    updateTask(task.id, { customFieldValues: { ...task.customFieldValues, [field.id]: v } });

  switch (field.type) {
    case "text":
      return <InlineText value={(raw as string | undefined) ?? ""} onCommit={setVal} />;

    case "number":
      return <InlineNumber value={(raw as number | undefined) ?? null} onCommit={setVal} />;

    case "currency":
      return <InlineNumber value={(raw as number | undefined) ?? null} onCommit={setVal} prefix="$" width={64} />;

    case "checkbox":
      return <Checkbox size="sm" checked={Boolean(raw)} onChange={(v) => setVal(v)} />;

    case "date": {
      const d = (raw as string | undefined) ?? null;
      return (
        <DatePicker value={d} onChange={(next) => setVal(next)} placeholder={field.name}>
          <button
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/8",
              d ? "text-white/70" : "text-white/30"
            )}
          >
            <Icon name="mingcute:calendar-line" size={13} />
            {d ? formatDate(d) : "—"}
          </button>
        </DatePicker>
      );
    }

    case "url": {
      const url = (raw as string | undefined) ?? "";
      return (
        <span className="flex items-center gap-1">
          <InlineText value={url} onCommit={setVal} placeholder="https://…" className="min-w-[120px]" />
          {url && (
            <button
              onClick={() => window.open(url.startsWith("http") ? url : `https://${url}`, "_blank", "noopener")}
              title="Open link"
              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-indigo-300"
            >
              <Icon name="mingcute:external-link-line" size={13} />
            </button>
          )}
        </span>
      );
    }

    case "rating": {
      const v = (raw as number | undefined) ?? 0;
      return (
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => setVal(i === v ? 0 : i)}
              title={`${i} / 5`}
              className="cursor-pointer transition-transform hover:scale-115"
            >
              <Icon
                name={i <= v ? "mingcute:star-fill" : "mingcute:star-line"}
                size={14}
                className={i <= v ? "text-amber-300" : "text-white/25"}
              />
            </button>
          ))}
        </span>
      );
    }

    case "progress": {
      const v = clamp((raw as number | undefined) ?? 0, 0, 100);
      return (
        <span className="flex items-center gap-2">
          <InlineNumber value={v} min={0} max={100} width={40} suffix="%" onCommit={(n) => setVal(clamp(n ?? 0, 0, 100))} />
          <span className="w-14 shrink-0">
            <ProgressBar value={v} height={4} />
          </span>
        </span>
      );
    }

    case "people": {
      const ids = (raw as ID[] | undefined) ?? [];
      return <PeopleCell ids={ids} onChange={(next) => setVal(next)} />;
    }

    case "select": {
      const current = field.options?.find((o) => o.id === raw);
      return (
        <Popover
          width={200}
          trigger={
            <button className="flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/8">
              {current ? <Badge color={current.color}>{current.label}</Badge> : <span className="text-xs text-white/30">—</span>}
            </button>
          }
        >
          <MenuList>
            <MenuLabel>{field.name}</MenuLabel>
            {(field.options ?? []).map((o) => (
              <MenuItem
                key={o.id}
                label={<Badge color={o.color}>{o.label}</Badge>}
                active={o.id === raw}
                onClick={() => setVal(o.id === raw ? null : o.id)}
              />
            ))}
          </MenuList>
        </Popover>
      );
    }

    case "multiselect": {
      const vals = (raw as string[] | undefined) ?? [];
      const selected = (field.options ?? []).filter((o) => vals.includes(o.id));
      const toggle = (id: string) => setVal(vals.includes(id) ? vals.filter((x) => x !== id) : [...vals, id]);
      return (
        <Popover
          width={212}
          trigger={
            <button className="flex max-w-[190px] cursor-pointer items-center gap-1 overflow-hidden rounded-lg px-1.5 py-1 transition-colors hover:bg-white/8">
              {selected.length ? (
                <>
                  {selected.slice(0, 2).map((o) => (
                    <Badge key={o.id} color={o.color} size="sm">
                      {o.label}
                    </Badge>
                  ))}
                  {selected.length > 2 && <span className="text-[10px] text-white/40">+{selected.length - 2}</span>}
                </>
              ) : (
                <span className="text-xs text-white/30">—</span>
              )}
            </button>
          }
        >
          <MenuList>
            <MenuLabel>{field.name}</MenuLabel>
            {(field.options ?? []).map((o) => (
              <button
                key={o.id}
                onClick={(e) => {
                  e.preventDefault();
                  toggle(o.id);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/8"
              >
                <Badge color={o.color}>{o.label}</Badge>
                <span className="flex-1" />
                <Checkbox size="sm" checked={vals.includes(o.id)} onChange={() => toggle(o.id)} />
              </button>
            ))}
          </MenuList>
        </Popover>
      );
    }

    default:
      return <span className="text-xs text-white/30">—</span>;
  }
}

function PeopleCell({ ids, onChange }: { ids: ID[]; onChange: (ids: ID[]) => void }) {
  const users = useStore((s) => s.users);
  const selected = users.filter((u) => ids.includes(u.id));
  return (
    <AssigneePicker value={ids} onChange={onChange}>
      {selected.length ? (
        <button className="cursor-pointer" title="People">
          <AvatarStack users={selected} size={20} max={3} />
        </button>
      ) : undefined}
    </AssigneePicker>
  );
}
