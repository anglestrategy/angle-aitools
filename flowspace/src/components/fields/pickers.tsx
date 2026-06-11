"use client";

import React, { useMemo, useState } from "react";
import type { ID, Priority, Project, Status, Tag, User } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn, formatDate, priorities, priorityMeta } from "@/lib/utils";
import { Avatar, Badge, Checkbox, Icon, Input, StatusDot } from "@/components/ui/primitives";
import { MenuItem, MenuLabel, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";

// ─── Status picker ──────────────────────────────────────────────────────────

export function StatusPicker({
  project,
  value,
  onChange,
  children,
  triggerClassName,
}: {
  project: Project;
  value: ID;
  onChange: (statusId: ID) => void;
  children?: React.ReactNode;
  triggerClassName?: string;
}) {
  const current = project.statuses.find((s) => s.id === value);
  return (
    <Popover
      width={210}
      triggerClassName={triggerClassName}
      trigger={
        children ?? (
          <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium hover:bg-white/8 transition-colors cursor-pointer" style={{ color: current?.color }}>
            <StatusDot color={current?.color ?? "#888"} />
            {current?.name ?? "No status"}
          </button>
        )
      }
    >
      <MenuList>
        <MenuLabel>Status</MenuLabel>
        {[...project.statuses]
          .sort((a, b) => a.order - b.order)
          .map((s) => (
            <MenuItem key={s.id} label={s.name} active={s.id === value} onClick={() => onChange(s.id)} icon="mingcute:round-fill" color={s.color} />
          ))}
      </MenuList>
    </Popover>
  );
}

// ─── Priority picker ────────────────────────────────────────────────────────

export function PriorityPicker({
  value,
  onChange,
  children,
  triggerClassName,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  children?: React.ReactNode;
  triggerClassName?: string;
}) {
  const meta = priorityMeta[value];
  return (
    <Popover
      width={190}
      triggerClassName={triggerClassName}
      trigger={
        children ?? (
          <button
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium hover:bg-white/8 transition-colors cursor-pointer"
            style={{ color: meta.color }}
          >
            <Icon name={meta.icon} size={14} />
            {meta.label}
          </button>
        )
      }
    >
      <MenuList>
        <MenuLabel>Priority</MenuLabel>
        {priorities.map((p) => (
          <MenuItem key={p} label={priorityMeta[p].label} icon={priorityMeta[p].icon} color={priorityMeta[p].color} active={p === value} onClick={() => onChange(p)} />
        ))}
      </MenuList>
    </Popover>
  );
}

// ─── Assignee picker (multi) ────────────────────────────────────────────────

export function AssigneePicker({
  value,
  onChange,
  children,
  memberIds,
  triggerClassName,
}: {
  value: ID[];
  onChange: (ids: ID[]) => void;
  children?: React.ReactNode;
  /** restrict list, e.g. to project members; default all workspace users */
  memberIds?: ID[];
  triggerClassName?: string;
}) {
  const users = useStore((s) => s.users);
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    let l = memberIds ? users.filter((u) => memberIds.includes(u.id)) : users;
    if (query.trim()) l = l.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));
    return l;
  }, [users, memberIds, query]);

  const toggle = (id: ID) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <Popover
      width={240}
      triggerClassName={triggerClassName}
      trigger={
        children ?? (
          <button className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/25 text-white/40 hover:text-white hover:border-white/50 transition-colors cursor-pointer">
            <Icon name="mingcute:user-add-line" size={14} />
          </button>
        )
      }
    >
      <div className="p-2 border-b border-white/8">
        <Input autoFocus icon="mingcute:search-line" inputSize="sm" placeholder="Search people…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full" />
      </div>
      <MenuList>
        {list.map((u) => (
          <button
            key={u.id}
            onClick={(e) => {
              e.preventDefault();
              toggle(u.id);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-white/85 hover:bg-white/8 transition-colors cursor-pointer"
          >
            <Avatar user={u} size={24} />
            <span className="flex-1 text-left truncate">
              {u.name}
              <span className="block text-[10px] text-white/35">{u.title}</span>
            </span>
            <Checkbox size="sm" checked={value.includes(u.id)} onChange={() => toggle(u.id)} />
          </button>
        ))}
        {!list.length && <div className="px-3 py-4 text-center text-xs text-white/35">No people found</div>}
      </MenuList>
    </Popover>
  );
}

// ─── Tag picker ─────────────────────────────────────────────────────────────

export function TagPicker({
  value,
  onChange,
  children,
  triggerClassName,
}: {
  value: ID[];
  onChange: (ids: ID[]) => void;
  children?: React.ReactNode;
  triggerClassName?: string;
}) {
  const tags = useStore((s) => s.tags);
  const createTag = useStore((s) => s.createTag);
  const [query, setQuery] = useState("");
  const list = query.trim() ? tags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())) : tags;
  const exact = tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  const toggle = (id: ID) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <Popover
      width={230}
      triggerClassName={triggerClassName}
      trigger={
        children ?? (
          <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/45 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
            <Icon name="mingcute:tag-line" size={13} />
            Tags
          </button>
        )
      }
    >
      <div className="p-2 border-b border-white/8">
        <Input autoFocus icon="mingcute:tag-line" inputSize="sm" placeholder="Search or create…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full" />
      </div>
      <MenuList>
        {list.map((t) => (
          <button
            key={t.id}
            onClick={(e) => {
              e.preventDefault();
              toggle(t.id);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/8 transition-colors cursor-pointer"
          >
            <Badge color={t.color}>{t.name}</Badge>
            <span className="flex-1" />
            <Checkbox size="sm" checked={value.includes(t.id)} onChange={() => toggle(t.id)} />
          </button>
        ))}
        {query.trim() && !exact && (
          <button
            onClick={(e) => {
              e.preventDefault();
              const id = createTag(query.trim(), "#8b5cf6");
              onChange([...value, id]);
              setQuery("");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-indigo-300 hover:bg-indigo-500/15 transition-colors cursor-pointer"
          >
            <Icon name="mingcute:add-line" size={14} />
            Create “{query.trim()}”
          </button>
        )}
        {!list.length && !query.trim() && <div className="px-3 py-4 text-center text-xs text-white/35">No tags yet</div>}
      </MenuList>
    </Popover>
  );
}

// ─── Date picker (mini calendar) ────────────────────────────────────────────

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

export function MiniCalendar({ value, onPick }: { value: string | null; onPick: (date: string | null) => void }) {
  const selected = value ? parseISO(value) : null;
  const [month, setMonth] = useState(selected ?? new Date());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div className="p-3 w-[252px]">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth(subMonths(month, 1))} className="flex h-6 w-6 items-center justify-center rounded-md text-white/50 hover:bg-white/8 hover:text-white cursor-pointer transition-colors">
          <Icon name="mingcute:left-line" size={14} />
        </button>
        <span className="text-xs font-semibold text-white/85">{format(month, "MMMM yyyy")}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="flex h-6 w-6 items-center justify-center rounded-md text-white/50 hover:bg-white/8 hover:text-white cursor-pointer transition-colors">
          <Icon name="mingcute:right-line" size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-center text-[10px] text-white/30 font-medium py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const sel = selected && isSameDay(d, selected);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPick(format(d, "yyyy-MM-dd"))}
              className={cn(
                "h-7 rounded-lg text-[11px] transition-colors cursor-pointer",
                sel
                  ? "accent-gradient text-white font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.5)]"
                  : isToday(d)
                    ? "text-indigo-300 font-semibold hover:bg-white/8"
                    : isSameMonth(d, month)
                      ? "text-white/75 hover:bg-white/8"
                      : "text-white/25 hover:bg-white/5"
              )}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2 pt-2 border-t border-white/8">
        <button onClick={() => onPick(format(new Date(), "yyyy-MM-dd"))} className="flex-1 h-6 rounded-md text-[10px] text-white/55 hover:bg-white/8 hover:text-white cursor-pointer transition-colors">
          Today
        </button>
        <button
          onClick={() => onPick(format(new Date(Date.now() + 86400000), "yyyy-MM-dd"))}
          className="flex-1 h-6 rounded-md text-[10px] text-white/55 hover:bg-white/8 hover:text-white cursor-pointer transition-colors"
        >
          Tomorrow
        </button>
        {value && (
          <button onClick={() => onPick(null)} className="flex-1 h-6 rounded-md text-[10px] text-rose-300/80 hover:bg-rose-500/15 cursor-pointer transition-colors">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  children,
  placeholder = "Due date",
  triggerClassName,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  children?: React.ReactNode;
  placeholder?: string;
  triggerClassName?: string;
}) {
  return (
    <Popover
      triggerClassName={triggerClassName}
      trigger={
        children ?? (
          <button className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors cursor-pointer hover:bg-white/8", value ? "text-white/75" : "text-white/40")}>
            <Icon name="mingcute:calendar-line" size={14} />
            {value ? formatDate(value) : placeholder}
          </button>
        )
      }
    >
      {(close) => (
        <MiniCalendar
          value={value}
          onPick={(d) => {
            onChange(d);
            close();
          }}
        />
      )}
    </Popover>
  );
}

// ─── Status badge (display only) ───────────────────────────────────────────

export function StatusBadge({ status }: { status: Status | undefined }) {
  if (!status) return null;
  return (
    <Badge color={status.color}>
      <StatusDot color={status.color} size={6} />
      {status.name}
    </Badge>
  );
}

export function PriorityFlag({ priority, showLabel = false, size = 14 }: { priority: Priority; showLabel?: boolean; size?: number }) {
  const meta = priorityMeta[priority];
  if (priority === "none" && !showLabel) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: meta.color }} title={meta.label}>
      <Icon name={meta.icon} size={size} />
      {showLabel && meta.label}
    </span>
  );
}

export function TagChips({ tagIds, tags, max = 3, size = "md" }: { tagIds: ID[]; tags: Tag[]; max?: number; size?: "sm" | "md" }) {
  const list = tagIds.map((id) => tags.find((t) => t.id === id)).filter(Boolean) as Tag[];
  if (!list.length) return null;
  const visible = list.slice(0, max);
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {visible.map((t) => (
        <Badge key={t.id} color={t.color} size={size}>
          {t.name}
        </Badge>
      ))}
      {list.length > max && <span className="text-[10px] text-white/40">+{list.length - max}</span>}
    </span>
  );
}

// ─── User display helpers ───────────────────────────────────────────────────

export function UserName({ userId }: { userId: ID | "automation" | null }) {
  const users = useStore((s) => s.users);
  if (userId === "automation") return <span className="text-indigo-300">Automation</span>;
  const u = users.find((x) => x.id === userId);
  return <>{u?.name ?? "Someone"}</>;
}

export function maybeUser(users: User[], id: ID | "automation" | null | undefined): User | null {
  if (!id || id === "automation") return null;
  return users.find((u) => u.id === id) ?? null;
}
