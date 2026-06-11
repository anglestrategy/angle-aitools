"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { defaultViewState } from "@/lib/types";
import type { GroupBy, ID, Priority, Project, SortBy, ViewState } from "@/lib/types";
import { cn, priorities, priorityMeta } from "@/lib/utils";
import { Avatar, Badge, Checkbox, Icon, Input } from "@/components/ui/primitives";
import { MenuItem, MenuLabel, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";

/** per-project view state hook shared by all views */
export function useViewState(projectId: ID): [ViewState, (patch: Partial<ViewState>) => void] {
  const vs = useStore((s) => s.viewStates[projectId]) ?? defaultViewState;
  const setViewState = useStore((s) => s.setViewState);
  return [vs, (patch) => setViewState(projectId, patch)];
}

const groupByOptions: { id: GroupBy; label: string; icon: string }[] = [
  { id: "status", label: "Status", icon: "mingcute:round-line" },
  { id: "assignee", label: "Assignee", icon: "mingcute:user-3-line" },
  { id: "priority", label: "Priority", icon: "mingcute:flag-2-line" },
  { id: "tag", label: "Tag", icon: "mingcute:tag-line" },
  { id: "dueDate", label: "Due date", icon: "mingcute:calendar-line" },
  { id: "none", label: "No grouping", icon: "mingcute:menu-line" },
];

const sortOptions: { id: SortBy; label: string; icon: string }[] = [
  { id: "manual", label: "Manual", icon: "mingcute:hand-line" },
  { id: "dueDate", label: "Due date", icon: "mingcute:calendar-line" },
  { id: "priority", label: "Priority", icon: "mingcute:flag-2-line" },
  { id: "title", label: "Title", icon: "mingcute:az-sort-ascending-letters-line" },
  { id: "createdAt", label: "Created", icon: "mingcute:add-circle-line" },
  { id: "updatedAt", label: "Updated", icon: "mingcute:history-line" },
];

function FilterChipButton({ active, icon, label, count, children }: { active: boolean; icon: string; label: string; count?: number; children: React.ReactNode }) {
  return (
    <Popover
      width={240}
      trigger={
        <button
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer",
            active ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30" : "text-white/55 hover:bg-white/8 hover:text-white border border-transparent"
          )}
        >
          <Icon name={icon} size={13} />
          {label}
          {count ? <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-400/30 px-1 text-[9px] font-bold">{count}</span> : null}
        </button>
      }
    >
      {children}
    </Popover>
  );
}

export function ViewToolbar({ project, hideGroupBy }: { project: Project; hideGroupBy?: boolean }) {
  const [vs, patch] = useViewState(project.id);
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const resetViewState = useStore((s) => s.resetViewState);

  const filterCount =
    vs.filterAssignees.length + vs.filterPriorities.length + vs.filterStatuses.length + vs.filterTags.length;

  const toggleIn = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const groupMeta = groupByOptions.find((g) => g.id === vs.groupBy)!;
  const sortMeta = sortOptions.find((g) => g.id === vs.sortBy)!;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2.5">
      <Input
        icon="mingcute:search-line"
        inputSize="sm"
        placeholder="Filter tasks…"
        value={vs.search}
        onChange={(e) => patch({ search: e.target.value })}
        className="w-48"
      />

      {/* group by */}
      {!hideGroupBy && (
        <Popover
          width={200}
          trigger={
            <button className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-white/55 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
              <Icon name={groupMeta.icon} size={13} />
              Group: {groupMeta.label}
            </button>
          }
        >
          <MenuList>
            <MenuLabel>Group by</MenuLabel>
            {groupByOptions.map((g) => (
              <MenuItem key={g.id} icon={g.icon} label={g.label} active={vs.groupBy === g.id} onClick={() => patch({ groupBy: g.id })} />
            ))}
          </MenuList>
        </Popover>
      )}

      {/* sort */}
      <Popover
        width={200}
        trigger={
          <button className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-white/55 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
            <Icon name="mingcute:sort-descending-line" size={13} />
            Sort: {sortMeta.label}
          </button>
        }
      >
        <MenuList>
          <MenuLabel>Sort by</MenuLabel>
          {sortOptions.map((g) => (
            <MenuItem key={g.id} icon={g.icon} label={g.label} active={vs.sortBy === g.id} onClick={(e) => { e.preventDefault(); patch({ sortBy: g.id }); }} />
          ))}
          <MenuSeparator />
          <MenuItem
            icon={vs.sortDir === "asc" ? "mingcute:arrow-up-line" : "mingcute:arrow-down-line"}
            label={vs.sortDir === "asc" ? "Ascending" : "Descending"}
            onClick={(e) => {
              e.preventDefault();
              patch({ sortDir: vs.sortDir === "asc" ? "desc" : "asc" });
            }}
          />
        </MenuList>
      </Popover>

      <span className="h-4 w-px bg-white/10 mx-0.5" />

      {/* assignees */}
      <FilterChipButton active={vs.filterAssignees.length > 0} icon="mingcute:user-3-line" label="Assignee" count={vs.filterAssignees.length}>
        <MenuList>
          <MenuLabel>Filter by assignee</MenuLabel>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => patch({ filterAssignees: toggleIn(vs.filterAssignees, u.id) })}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-white/85 hover:bg-white/8 transition-colors cursor-pointer"
            >
              <Avatar user={u} size={22} />
              <span className="flex-1 text-left truncate">{u.name}</span>
              <Checkbox size="sm" checked={vs.filterAssignees.includes(u.id)} onChange={() => patch({ filterAssignees: toggleIn(vs.filterAssignees, u.id) })} />
            </button>
          ))}
          <button
            onClick={() => patch({ filterAssignees: toggleIn(vs.filterAssignees, "unassigned") })}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-white/60 hover:bg-white/8 transition-colors cursor-pointer"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-white/30">
              <Icon name="mingcute:user-x-line" size={11} />
            </span>
            <span className="flex-1 text-left">Unassigned</span>
            <Checkbox size="sm" checked={vs.filterAssignees.includes("unassigned")} onChange={() => patch({ filterAssignees: toggleIn(vs.filterAssignees, "unassigned") })} />
          </button>
        </MenuList>
      </FilterChipButton>

      {/* priority */}
      <FilterChipButton active={vs.filterPriorities.length > 0} icon="mingcute:flag-2-line" label="Priority" count={vs.filterPriorities.length}>
        <MenuList>
          <MenuLabel>Filter by priority</MenuLabel>
          {priorities.map((p: Priority) => (
            <button
              key={p}
              onClick={() => patch({ filterPriorities: toggleIn(vs.filterPriorities, p) })}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-white/85 hover:bg-white/8 transition-colors cursor-pointer"
            >
              <Icon name={priorityMeta[p].icon} size={14} style={{ color: priorityMeta[p].color }} />
              <span className="flex-1 text-left">{priorityMeta[p].label}</span>
              <Checkbox size="sm" checked={vs.filterPriorities.includes(p)} onChange={() => patch({ filterPriorities: toggleIn(vs.filterPriorities, p) })} />
            </button>
          ))}
        </MenuList>
      </FilterChipButton>

      {/* status */}
      <FilterChipButton active={vs.filterStatuses.length > 0} icon="mingcute:round-line" label="Status" count={vs.filterStatuses.length}>
        <MenuList>
          <MenuLabel>Filter by status</MenuLabel>
          {[...project.statuses]
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <button
                key={s.id}
                onClick={() => patch({ filterStatuses: toggleIn(vs.filterStatuses, s.id) })}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-white/85 hover:bg-white/8 transition-colors cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="flex-1 text-left">{s.name}</span>
                <Checkbox size="sm" checked={vs.filterStatuses.includes(s.id)} onChange={() => patch({ filterStatuses: toggleIn(vs.filterStatuses, s.id) })} />
              </button>
            ))}
        </MenuList>
      </FilterChipButton>

      {/* tags */}
      <FilterChipButton active={vs.filterTags.length > 0} icon="mingcute:tag-line" label="Tags" count={vs.filterTags.length}>
        <MenuList>
          <MenuLabel>Filter by tag</MenuLabel>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => patch({ filterTags: toggleIn(vs.filterTags, t.id) })}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/8 transition-colors cursor-pointer"
            >
              <Badge color={t.color}>{t.name}</Badge>
              <span className="flex-1" />
              <Checkbox size="sm" checked={vs.filterTags.includes(t.id)} onChange={() => patch({ filterTags: toggleIn(vs.filterTags, t.id) })} />
            </button>
          ))}
        </MenuList>
      </FilterChipButton>

      <span className="h-4 w-px bg-white/10 mx-0.5" />

      {/* toggles */}
      <button
        onClick={() => patch({ showCompleted: !vs.showCompleted })}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer",
          vs.showCompleted ? "text-white/55 hover:bg-white/8" : "bg-white/8 text-white/85"
        )}
        title={vs.showCompleted ? "Hide completed" : "Show completed"}
      >
        <Icon name={vs.showCompleted ? "mingcute:eye-2-line" : "mingcute:eye-close-line"} size={13} />
        Done
      </button>
      <button
        onClick={() => patch({ showSubtasks: !vs.showSubtasks })}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer",
          vs.showSubtasks ? "bg-white/8 text-white/85" : "text-white/55 hover:bg-white/8"
        )}
        title="Show subtasks as separate rows"
      >
        <Icon name="mingcute:git-merge-line" size={13} />
        Subtasks
      </button>

      {(filterCount > 0 || vs.search) && (
        <button
          onClick={() => resetViewState(project.id)}
          className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-rose-300/85 hover:bg-rose-500/12 transition-colors cursor-pointer"
        >
          <Icon name="mingcute:close-circle-line" size={13} />
          Clear
        </button>
      )}
    </div>
  );
}
