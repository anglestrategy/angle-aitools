"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type {
  Automation,
  AutomationAction,
  AutomationActionType,
  AutomationCondition,
  AutomationTrigger,
  AutomationTriggerType,
  ID,
  Status,
} from "@/lib/types";
import { cn, priorities, priorityMeta, timeAgo } from "@/lib/utils";
import { Badge, Button, EmptyState, Icon, IconButton, Toggle } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuList, MenuSeparator, Modal, ModalHeader, Popover } from "@/components/ui/overlay";

// ─── Meta ────────────────────────────────────────────────────────────────────

const triggerMeta: Record<AutomationTriggerType, { label: string; icon: string; color: string }> = {
  status_changed: { label: "Status changes", icon: "mingcute:transfer-line", color: "#38bdf8" },
  task_created: { label: "Task is created", icon: "mingcute:add-line", color: "#34d399" },
  priority_changed: { label: "Priority changes", icon: "mingcute:flag-2-fill", color: "#fbbf24" },
  assignee_added: { label: "Assignee is added", icon: "mingcute:user-add-line", color: "#a78bfa" },
  due_date_arrives: { label: "Due date arrives", icon: "mingcute:calendar-line", color: "#fb7185" },
  tag_added: { label: "Tag is added", icon: "mingcute:tag-line", color: "#f97316" },
  task_completed: { label: "Task is completed", icon: "mingcute:check-circle-line", color: "#34d399" },
};

const actionMeta: Record<AutomationActionType, { label: string; icon: string; color: string }> = {
  set_status: { label: "Set status", icon: "mingcute:round-fill", color: "#38bdf8" },
  set_priority: { label: "Set priority", icon: "mingcute:flag-2-fill", color: "#fbbf24" },
  assign_user: { label: "Assign user", icon: "mingcute:user-add-line", color: "#a78bfa" },
  add_tag: { label: "Add tag", icon: "mingcute:tag-line", color: "#f97316" },
  set_due_date_relative: { label: "Set due date", icon: "mingcute:calendar-add-line", color: "#fb7185" },
  post_comment: { label: "Post comment", icon: "mingcute:message-3-line", color: "#67e8f9" },
  notify_user: { label: "Notify user", icon: "mingcute:notification-line", color: "#fbbf24" },
  move_to_project: { label: "Move to project", icon: "mingcute:folder-2-line", color: "#34d399" },
  create_subtask: { label: "Create subtask", icon: "mingcute:task-2-line", color: "#818cf8" },
  archive_task: { label: "Archive task", icon: "mingcute:archive-line", color: "#94a3b8" },
};

const conditionFields = [
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "tag", label: "Tag" },
] as const;

// ─── Small popover select ────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

function ClauseSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  width = 210,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Popover
      width={width}
      trigger={
        <button className="input-glass flex h-8 max-w-[220px] items-center gap-1.5 px-2.5 text-xs cursor-pointer">
          {current?.icon && <Icon name={current.icon} size={13} style={current.color ? { color: current.color } : undefined} />}
          <span className={cn("truncate", current ? "text-white/85" : "text-white/35")}>{current?.label ?? placeholder}</span>
          <Icon name="mingcute:down-line" size={12} className="shrink-0 text-white/40" />
        </button>
      }
    >
      <MenuList>
        {options.map((o) => (
          <MenuItem key={o.value} icon={o.icon} color={o.color} label={o.label} active={o.value === value} onClick={() => onChange(o.value)} />
        ))}
      </MenuList>
    </Popover>
  );
}

// ─── Humanizing helpers ──────────────────────────────────────────────────────

interface Ctx {
  statusById: (id?: string) => Status | undefined;
  userName: (id?: string) => string;
  tagName: (id?: string) => string;
  projectName: (id?: string) => string;
}

function triggerText(t: AutomationTrigger, ctx: Ctx): string {
  const cfg = t.config;
  switch (t.type) {
    case "status_changed":
      return cfg.statusId ? `status changes to ${ctx.statusById(cfg.statusId)?.name ?? "a status"}` : "status changes";
    case "task_created":
      return "a task is created";
    case "priority_changed":
      return cfg.priority ? `priority changes to ${priorityMeta[cfg.priority as keyof typeof priorityMeta]?.label ?? cfg.priority}` : "priority changes";
    case "assignee_added":
      return cfg.userId ? `${ctx.userName(cfg.userId)} is assigned` : "an assignee is added";
    case "due_date_arrives":
      return "the due date arrives";
    case "tag_added":
      return cfg.tagId ? `tag “${ctx.tagName(cfg.tagId)}” is added` : "a tag is added";
    case "task_completed":
      return "a task is completed";
  }
}

function conditionText(c: AutomationCondition, ctx: Ctx): string {
  const op = c.operator === "is" ? "is" : "is not";
  let val = c.value;
  if (c.field === "priority") val = priorityMeta[c.value as keyof typeof priorityMeta]?.label ?? c.value;
  if (c.field === "status") val = ctx.statusById(c.value)?.name ?? c.value;
  if (c.field === "assignee") val = ctx.userName(c.value);
  if (c.field === "tag") val = ctx.tagName(c.value);
  return `${c.field} ${op} ${val}`;
}

function actionText(a: AutomationAction, ctx: Ctx): string {
  const cfg = a.config;
  switch (a.type) {
    case "set_status":
      return `set status to ${ctx.statusById(cfg.statusId)?.name ?? "…"}`;
    case "set_priority":
      return `set priority to ${priorityMeta[cfg.priority as keyof typeof priorityMeta]?.label ?? "…"}`;
    case "assign_user":
      return `assign ${ctx.userName(cfg.userId)}`;
    case "add_tag":
      return `add tag “${ctx.tagName(cfg.tagId)}”`;
    case "set_due_date_relative":
      return `set due date to +${cfg.days ?? "1"}d`;
    case "post_comment":
      return "post a comment";
    case "notify_user":
      return `notify ${ctx.userName(cfg.userId)}`;
    case "move_to_project":
      return `move to ${ctx.projectName(cfg.projectId)}`;
    case "create_subtask":
      return `create subtask “${cfg.title ?? "Follow-up"}”`;
    case "archive_task":
      return "archive the task";
  }
}

function useCtx(): Ctx {
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  return useMemo(
    () => ({
      statusById: (id) => (id ? projects.flatMap((p) => p.statuses).find((st) => st.id === id) : undefined),
      userName: (id) => users.find((u) => u.id === id)?.name ?? "someone",
      tagName: (id) => tags.find((t) => t.id === id)?.name ?? "tag",
      projectName: (id) => projects.find((p) => p.id === id)?.name ?? "a project",
    }),
    [projects, users, tags]
  );
}

// ─── Builder modal ───────────────────────────────────────────────────────────

interface Draft {
  id: ID | null;
  name: string;
  projectId: ID | null;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

function emptyDraft(projectId: ID | null): Draft {
  return {
    id: null,
    name: "",
    projectId,
    enabled: true,
    trigger: { type: "task_created", config: {} },
    conditions: [],
    actions: [{ type: "set_status", config: {} }],
  };
}

function ClauseRow({ label, color, icon, children }: { label: string; color: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-2 w-12 shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
        {label}
      </span>
      <div className="glass-soft flex min-h-[48px] flex-1 flex-wrap items-center gap-2 rounded-xl px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}20`, color }}>
          <Icon name={icon} size={14} />
        </span>
        {children}
      </div>
    </div>
  );
}

function BuilderModal({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const toast = useUI((s) => s.toast);
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const createAutomation = useStore((s) => s.createAutomation);
  const updateAutomation = useStore((s) => s.updateAutomation);

  // mounted fresh per open, so the draft prop seeds local state
  const [d, setD] = useState<Draft>(draft);

  const project = projects.find((p) => p.id === d?.projectId) ?? null;
  const statusOptions: SelectOption[] = useMemo(() => {
    const list = project ? project.statuses : projects.flatMap((p) => p.statuses);
    const seen = new Set<string>();
    return list
      .filter((st) => (seen.has(st.id) ? false : (seen.add(st.id), true)))
      .map((st) => ({ value: st.id, label: st.name, icon: "mingcute:round-fill", color: st.color }));
  }, [project, projects]);
  const userOptions: SelectOption[] = users.map((u) => ({ value: u.id, label: u.name, icon: "mingcute:user-3-line", color: u.color }));
  const tagOptions: SelectOption[] = tags.map((t) => ({ value: t.id, label: t.name, icon: "mingcute:tag-line", color: t.color }));
  const priorityOptions: SelectOption[] = priorities.map((p) => ({
    value: p,
    label: priorityMeta[p].label,
    icon: priorityMeta[p].icon,
    color: priorityMeta[p].color,
  }));
  const projectOptions: SelectOption[] = projects.filter((p) => !p.archived).map((p) => ({ value: p.id, label: p.name, icon: p.icon, color: p.color }));

  const patch = (p: Partial<Draft>) => setD((cur) => ({ ...cur, ...p }));
  const patchTriggerCfg = (key: string, value: string | null) =>
    setD((cur) => {
      const config = { ...cur.trigger.config };
      if (value === null) delete config[key];
      else config[key] = value;
      return { ...cur, trigger: { ...cur.trigger, config } };
    });
  const patchAction = (i: number, p: Partial<AutomationAction>) =>
    setD((cur) => ({ ...cur, actions: cur.actions.map((a, j) => (j === i ? { ...a, ...p } : a)) }));
  const patchActionCfg = (i: number, key: string, value: string) =>
    setD((cur) => ({ ...cur, actions: cur.actions.map((a, j) => (j === i ? { ...a, config: { ...a.config, [key]: value } } : a)) }));
  const patchCondition = (i: number, p: Partial<AutomationCondition>) =>
    setD((cur) => ({ ...cur, conditions: cur.conditions.map((c, j) => (j === i ? { ...c, ...p } : c)) }));

  const conditionValueOptions = (field: AutomationCondition["field"]): SelectOption[] => {
    if (field === "priority") return priorityOptions;
    if (field === "status") return statusOptions;
    if (field === "assignee") return userOptions;
    return tagOptions;
  };

  const triggerCfgControl = () => {
    const t = d.trigger;
    switch (t.type) {
      case "status_changed":
        return (
          <ClauseSelect
            value={t.config.statusId ?? "any"}
            options={[{ value: "any", label: "Any status", icon: "mingcute:round-fill", color: "#94a3b8" }, ...statusOptions]}
            onChange={(v) => patchTriggerCfg("statusId", v === "any" ? null : v)}
          />
        );
      case "priority_changed":
        return (
          <ClauseSelect
            value={t.config.priority ?? "any"}
            options={[{ value: "any", label: "Any priority", icon: "mingcute:flag-2-fill", color: "#94a3b8" }, ...priorityOptions]}
            onChange={(v) => patchTriggerCfg("priority", v === "any" ? null : v)}
          />
        );
      case "tag_added":
        return (
          <ClauseSelect
            value={t.config.tagId ?? "any"}
            options={[{ value: "any", label: "Any tag", icon: "mingcute:tag-line", color: "#94a3b8" }, ...tagOptions]}
            onChange={(v) => patchTriggerCfg("tagId", v === "any" ? null : v)}
          />
        );
      case "assignee_added":
        return (
          <ClauseSelect
            value={t.config.userId ?? "any"}
            options={[{ value: "any", label: "Anyone", icon: "mingcute:user-3-line", color: "#94a3b8" }, ...userOptions]}
            onChange={(v) => patchTriggerCfg("userId", v === "any" ? null : v)}
          />
        );
      default:
        return <span className="text-[11px] text-white/35">No extra configuration needed</span>;
    }
  };

  const actionCfgControl = (a: AutomationAction, i: number) => {
    switch (a.type) {
      case "set_status":
        return <ClauseSelect value={a.config.statusId ?? null} options={statusOptions} onChange={(v) => patchActionCfg(i, "statusId", v)} placeholder="Pick status…" />;
      case "set_priority":
        return <ClauseSelect value={a.config.priority ?? null} options={priorityOptions} onChange={(v) => patchActionCfg(i, "priority", v)} placeholder="Pick priority…" />;
      case "assign_user":
      case "notify_user":
        return <ClauseSelect value={a.config.userId ?? null} options={userOptions} onChange={(v) => patchActionCfg(i, "userId", v)} placeholder="Pick person…" />;
      case "add_tag":
        return <ClauseSelect value={a.config.tagId ?? null} options={tagOptions} onChange={(v) => patchActionCfg(i, "tagId", v)} placeholder="Pick tag…" />;
      case "set_due_date_relative":
        return (
          <span className="flex items-center gap-1.5 text-xs text-white/60">
            in
            <input
              type="number"
              min={0}
              value={a.config.days ?? "1"}
              onChange={(e) => patchActionCfg(i, "days", e.target.value)}
              className="input-glass h-8 w-14 px-2 text-center text-xs"
            />
            days
          </span>
        );
      case "post_comment":
        return (
          <input
            value={a.config.body ?? ""}
            onChange={(e) => patchActionCfg(i, "body", e.target.value)}
            placeholder="Comment text…"
            className="input-glass h-8 min-w-[180px] flex-1 px-2.5 text-xs"
          />
        );
      case "move_to_project":
        return <ClauseSelect value={a.config.projectId ?? null} options={projectOptions} onChange={(v) => patchActionCfg(i, "projectId", v)} placeholder="Pick project…" />;
      case "create_subtask":
        return (
          <input
            value={a.config.title ?? ""}
            onChange={(e) => patchActionCfg(i, "title", e.target.value)}
            placeholder="Subtask title…"
            className="input-glass h-8 min-w-[180px] flex-1 px-2.5 text-xs"
          />
        );
      case "archive_task":
        return <span className="text-[11px] text-white/35">The task will be archived</span>;
    }
  };

  const save = () => {
    if (!d.name.trim() || d.actions.length === 0) return;
    const payload = {
      name: d.name.trim(),
      projectId: d.projectId,
      enabled: d.enabled,
      trigger: d.trigger,
      conditions: d.conditions,
      actions: d.actions,
    };
    if (d.id) {
      updateAutomation(d.id, payload);
      toast("Automation updated", { body: payload.name, icon: "mingcute:lightning-line" });
    } else {
      createAutomation(payload);
      toast("Automation created", { body: payload.name, icon: "mingcute:lightning-line" });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={660}>
      <ModalHeader title={d.id ? "Edit automation" : "New automation"} icon="mingcute:lightning-line" onClose={onClose} />
      <div className="space-y-5 p-5">
        <input
          autoFocus
          value={d.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Automation name — e.g. Escalate urgent bugs"
          className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/25 outline-none"
        />

        {/* project scope */}
        <ClauseRow label="In" color="#94a3b8" icon={project?.icon ?? "mingcute:building-2-line"}>
          <ClauseSelect
            value={d.projectId ?? "all"}
            options={[{ value: "all", label: "All projects", icon: "mingcute:building-2-line", color: "#94a3b8" }, ...projectOptions]}
            onChange={(v) => patch({ projectId: v === "all" ? null : v })}
            width={240}
          />
          <span className="text-[11px] text-white/35">{project ? "Runs only on this project’s tasks" : "Runs on every task in the workspace"}</span>
        </ClauseRow>

        {/* trigger */}
        <ClauseRow label="When" color="#38bdf8" icon={triggerMeta[d.trigger.type].icon}>
          <ClauseSelect
            value={d.trigger.type}
            options={(Object.keys(triggerMeta) as AutomationTriggerType[]).map((t) => ({
              value: t,
              label: triggerMeta[t].label,
              icon: triggerMeta[t].icon,
              color: triggerMeta[t].color,
            }))}
            onChange={(v) => patch({ trigger: { type: v as AutomationTriggerType, config: {} } })}
            width={230}
          />
          {triggerCfgControl()}
        </ClauseRow>

        {/* conditions */}
        <div className="space-y-2">
          {d.conditions.map((c, i) => (
            <ClauseRow key={i} label={i === 0 ? "If" : "And"} color="#fbbf24" icon="mingcute:filter-line">
              <ClauseSelect
                value={c.field}
                options={conditionFields.map((f) => ({ value: f.value, label: f.label }))}
                onChange={(v) => patchCondition(i, { field: v as AutomationCondition["field"], value: "" })}
                width={150}
              />
              <ClauseSelect
                value={c.operator}
                options={[
                  { value: "is", label: "is" },
                  { value: "is_not", label: "is not" },
                ]}
                onChange={(v) => patchCondition(i, { operator: v as AutomationCondition["operator"] })}
                width={120}
              />
              <ClauseSelect
                value={c.value || null}
                options={conditionValueOptions(c.field)}
                onChange={(v) => patchCondition(i, { value: v })}
                placeholder="Pick value…"
              />
              <span className="flex-1" />
              <IconButton
                size="xs"
                icon="mingcute:close-line"
                label="Remove condition"
                onClick={() => patch({ conditions: d.conditions.filter((_, j) => j !== i) })}
              />
            </ClauseRow>
          ))}
          <div className="pl-[60px]">
            <Button
              size="xs"
              variant="ghost"
              icon="mingcute:add-line"
              onClick={() => patch({ conditions: [...d.conditions, { field: "priority", operator: "is", value: "urgent" }] })}
            >
              Add condition
            </Button>
          </div>
        </div>

        {/* actions */}
        <div className="space-y-2">
          {d.actions.map((a, i) => (
            <ClauseRow key={i} label={i === 0 ? "Then" : "And"} color="#34d399" icon={actionMeta[a.type].icon}>
              <ClauseSelect
                value={a.type}
                options={(Object.keys(actionMeta) as AutomationActionType[]).map((t) => ({
                  value: t,
                  label: actionMeta[t].label,
                  icon: actionMeta[t].icon,
                  color: actionMeta[t].color,
                }))}
                onChange={(v) => patchAction(i, { type: v as AutomationActionType, config: {} })}
                width={210}
              />
              {actionCfgControl(a, i)}
              <span className="flex-1" />
              <IconButton
                size="xs"
                icon="mingcute:close-line"
                label="Remove action"
                disabled={d.actions.length <= 1}
                className={d.actions.length <= 1 ? "opacity-30 pointer-events-none" : ""}
                onClick={() => patch({ actions: d.actions.filter((_, j) => j !== i) })}
              />
            </ClauseRow>
          ))}
          <div className="pl-[60px]">
            <Button
              size="xs"
              variant="ghost"
              icon="mingcute:add-line"
              onClick={() => patch({ actions: [...d.actions, { type: "post_comment", config: {} }] })}
            >
              Add action
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/8 pt-4">
          <label className="flex items-center gap-2 text-xs text-white/60">
            <Toggle size="sm" on={d.enabled} onChange={(v) => patch({ enabled: v })} />
            Enabled
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon="mingcute:check-line" onClick={save} disabled={!d.name.trim() || d.actions.length === 0}>
              {d.id ? "Save changes" : "Create automation"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Automation card ─────────────────────────────────────────────────────────

function AutomationCard({ auto, index, onEdit }: { auto: Automation; index: number; onEdit: (a: Automation) => void }) {
  const ctx = useCtx();
  const toast = useUI((s) => s.toast);
  const projects = useStore((s) => s.projects);
  const updateAutomation = useStore((s) => s.updateAutomation);
  const deleteAutomation = useStore((s) => s.deleteAutomation);
  const createAutomation = useStore((s) => s.createAutomation);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(auto.name);

  const project = projects.find((p) => p.id === auto.projectId) ?? null;
  const tMeta = triggerMeta[auto.trigger.type];

  const commitName = () => {
    setEditingName(false);
    const next = name.trim();
    if (next && next !== auto.name) updateAutomation(auto.id, { name: next });
    else setName(auto.name);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(index * 0.05, 0.35) }}
      className={cn("glass-card p-4 transition-opacity", !auto.enabled && "opacity-60")}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${tMeta.color}1c`, color: tMeta.color }}>
          <Icon name={tMeta.icon} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setName(auto.name);
                  setEditingName(false);
                }
              }}
              className="input-glass h-7 w-full max-w-sm px-2 text-sm font-semibold"
            />
          ) : (
            <button
              onClick={() => {
                setName(auto.name);
                setEditingName(true);
              }}
              className="block max-w-full truncate text-left text-sm font-semibold text-white/90 hover:text-white cursor-text"
              title="Click to rename"
            >
              {auto.name}
            </button>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {project ? (
              <Badge color={project.color} size="sm">
                <Icon name={project.icon} size={10} />
                {project.name}
              </Badge>
            ) : (
              <Badge size="sm">
                <Icon name="mingcute:building-2-line" size={10} />
                All projects
              </Badge>
            )}
            <span className="text-[10px] text-white/35">
              {auto.runs} run{auto.runs === 1 ? "" : "s"}
              {auto.lastRunAt ? ` · last ${timeAgo(auto.lastRunAt)}` : " · never ran"}
            </span>
          </div>
        </div>
        <Toggle on={auto.enabled} onChange={(v) => updateAutomation(auto.id, { enabled: v })} />
        <Popover width={180} align="end" trigger={<IconButton size="sm" icon="mingcute:more-1-line" label="Automation actions" />}>
          <MenuList>
            <MenuItem icon="mingcute:edit-2-line" label="Edit" onClick={() => onEdit(auto)} />
            <MenuItem
              icon="mingcute:copy-2-line"
              label="Duplicate"
              onClick={() => {
                createAutomation({
                  name: `${auto.name} (copy)`,
                  projectId: auto.projectId,
                  enabled: false,
                  trigger: JSON.parse(JSON.stringify(auto.trigger)),
                  conditions: JSON.parse(JSON.stringify(auto.conditions)),
                  actions: JSON.parse(JSON.stringify(auto.actions)),
                });
                toast("Automation duplicated", { body: `${auto.name} (copy)`, icon: "mingcute:copy-2-line" });
              }}
            />
            <MenuSeparator />
            <MenuItem icon="mingcute:delete-2-line" label="Delete" danger onClick={() => setConfirmDelete(true)} />
          </MenuList>
        </Popover>
      </div>

      {/* human-readable rule */}
      <p className="mt-3 rounded-xl border border-white/6 bg-white/3 px-3 py-2 text-xs leading-relaxed text-white/65">
        <span className="font-bold tracking-wide text-sky-300">WHEN </span>
        {triggerText(auto.trigger, ctx)}
        {auto.conditions.length > 0 && (
          <>
            <span className="font-bold tracking-wide text-amber-300"> IF </span>
            {auto.conditions.map((c) => conditionText(c, ctx)).join(" and ")}
          </>
        )}
        <span className="font-bold tracking-wide text-emerald-300"> THEN </span>
        {auto.actions.map((a) => actionText(a, ctx)).join(", ")}
      </p>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${auto.name}”?`}
        body="The automation will stop running immediately. This cannot be undone."
        onConfirm={() => {
          deleteAutomation(auto.id);
          toast("Automation deleted", { body: auto.name, icon: "mingcute:delete-2-line", kind: "info" });
        }}
      />
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const automations = useStore((s) => s.automations);
  const projects = useStore((s) => s.projects);

  const [filter, setFilter] = useState<ID | "all">("all");
  const [builder, setBuilder] = useState<Draft | null>(null);

  const visible = automations.filter((a) => filter === "all" || a.projectId === filter);
  const enabled = automations.filter((a) => a.enabled).length;
  const totalRuns = automations.reduce((s, a) => s + a.runs, 0);

  const openEdit = (a: Automation) =>
    setBuilder({
      id: a.id,
      name: a.name,
      projectId: a.projectId,
      enabled: a.enabled,
      trigger: JSON.parse(JSON.stringify(a.trigger)),
      conditions: JSON.parse(JSON.stringify(a.conditions)),
      actions: JSON.parse(JSON.stringify(a.actions)),
    });

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_16px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:lightning-line" size={18} className="text-white" />
        </span>
        <div>
          <h1 className="text-[15px] font-semibold text-white/95">Automations</h1>
          <p className="text-[11px] text-white/40">Put repetitive work on autopilot</p>
        </div>
        <span className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="glass-soft flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-white/70">
            <Icon name="mingcute:lightning-line" size={13} className="text-indigo-300" />
            {automations.length} total
          </span>
          <span className="glass-soft flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-emerald-300">
            <Icon name="mingcute:check-circle-line" size={13} />
            {enabled} enabled
          </span>
          <span className="glass-soft flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-white/70">
            <Icon name="mingcute:history-line" size={13} className="text-sky-300" />
            {totalRuns} runs
          </span>
        </div>
        <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => setBuilder(emptyDraft(filter === "all" ? null : filter))}>
          New automation
        </Button>
      </div>

      {/* project filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/8 px-5 py-2.5">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors cursor-pointer",
            filter === "all" ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-100" : "border-white/10 text-white/55 hover:bg-white/6 hover:text-white"
          )}
        >
          All
          <span className="text-[10px] opacity-60">{automations.length}</span>
        </button>
        {projects
          .filter((p) => !p.archived)
          .map((p) => {
            const n = automations.filter((a) => a.projectId === p.id).length;
            return (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                className={cn(
                  "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors cursor-pointer",
                  filter === p.id ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-100" : "border-white/10 text-white/55 hover:bg-white/6 hover:text-white"
                )}
              >
                <Icon name={p.icon} size={12} style={{ color: p.color }} />
                {p.name}
                {n > 0 && <span className="text-[10px] opacity-60">{n}</span>}
              </button>
            );
          })}
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {visible.length === 0 ? (
          <EmptyState
            icon="mingcute:lightning-line"
            title={filter === "all" ? "No automations yet" : "No automations for this project"}
            body="Build WHEN → THEN rules to move tasks, assign people and post updates automatically."
            action={
              <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => setBuilder(emptyDraft(filter === "all" ? null : filter))}>
                Create automation
              </Button>
            }
          />
        ) : (
          <div className="mx-auto max-w-4xl space-y-3">
            {visible.map((a, i) => (
              <AutomationCard key={a.id} auto={a} index={i} onEdit={openEdit} />
            ))}
          </div>
        )}
      </div>

      {builder && <BuilderModal draft={builder} onClose={() => setBuilder(null)} />}
    </div>
  );
}
