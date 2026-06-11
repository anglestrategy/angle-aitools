"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { CustomFieldDef, CustomFieldType, Project, Status, ViewType } from "@/lib/types";
import { cn, colorPalette, uid } from "@/lib/utils";
import { Badge, Button, Checkbox, Icon, Input, Textarea } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuList, Modal, ModalHeader, Popover } from "@/components/ui/overlay";
import { AssigneePicker } from "@/components/fields/pickers";
import { AvatarStack } from "@/components/ui/primitives";

const statusKinds: { id: Status["kind"]; label: string; hint: string }[] = [
  { id: "open", label: "Open", hint: "Not started" },
  { id: "active", label: "Active", hint: "In flight" },
  { id: "done", label: "Done", hint: "Counts as complete" },
  { id: "closed", label: "Closed", hint: "Complete, hidden by default" },
];

const fieldTypes: { id: CustomFieldType; label: string; icon: string }[] = [
  { id: "text", label: "Text", icon: "mingcute:text-line" },
  { id: "number", label: "Number", icon: "mingcute:hashtag-line" },
  { id: "select", label: "Select", icon: "mingcute:list-check-2-line" },
  { id: "multiselect", label: "Multi-select", icon: "mingcute:checks-line" },
  { id: "date", label: "Date", icon: "mingcute:calendar-line" },
  { id: "checkbox", label: "Checkbox", icon: "mingcute:checkbox-line" },
  { id: "url", label: "URL", icon: "mingcute:link-2-line" },
  { id: "currency", label: "Currency", icon: "mingcute:currency-dollar-line" },
  { id: "rating", label: "Rating", icon: "mingcute:star-line" },
  { id: "people", label: "People", icon: "mingcute:group-line" },
  { id: "progress", label: "Progress", icon: "mingcute:loading-3-line" },
];

const viewOptions: { id: ViewType; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "mingcute:compass-line" },
  { id: "list", label: "List", icon: "mingcute:list-check-line" },
  { id: "board", label: "Board", icon: "mingcute:columns-3-line" },
  { id: "table", label: "Table", icon: "mingcute:table-2-line" },
  { id: "calendar", label: "Calendar", icon: "mingcute:calendar-month-line" },
  { id: "gantt", label: "Gantt", icon: "mingcute:chart-horizontal-line" },
  { id: "workload", label: "Workload", icon: "mingcute:group-3-line" },
  { id: "activity", label: "Activity", icon: "mingcute:history-line" },
];

const projectIcons = [
  "mingcute:folder-2-line", "mingcute:rocket-line", "mingcute:code-line", "mingcute:palette-line",
  "mingcute:bug-line", "mingcute:announcement-line", "mingcute:earth-line", "mingcute:cellphone-line",
  "mingcute:book-2-line", "mingcute:shopping-bag-2-line", "mingcute:flask-line", "mingcute:heartbeat-line",
];

function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colorPalette.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn("h-5.5 w-5.5 rounded-full cursor-pointer transition-transform", c === value && "ring-2 ring-white/70 scale-110")}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function StatusRow({ project, status }: { project: Project; status: Status }) {
  const updateStatus = useStore((s) => s.updateStatus);
  const deleteStatus = useStore((s) => s.deleteStatus);
  const tasks = useStore((s) => s.tasks);
  const [confirm, setConfirm] = useState(false);
  const count = tasks.filter((t) => t.projectId === project.id && t.statusId === status.id && !t.archived).length;

  const move = (dir: -1 | 1) => {
    const sorted = [...project.statuses].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === status.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    updateStatus(project.id, status.id, { order: swap.order });
    updateStatus(project.id, swap.id, { order: status.order });
  };

  return (
    <motion.div layout className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2">
      <div className="flex flex-col gap-0.5">
        <button onClick={() => move(-1)} className="text-white/30 hover:text-white cursor-pointer">
          <Icon name="mingcute:up-line" size={11} />
        </button>
        <button onClick={() => move(1)} className="text-white/30 hover:text-white cursor-pointer">
          <Icon name="mingcute:down-line" size={11} />
        </button>
      </div>
      <Popover
        width={180}
        trigger={
          <button className="h-4 w-4 rounded-full cursor-pointer ring-2 ring-white/10 hover:ring-white/30 transition-all" style={{ backgroundColor: status.color }} />
        }
      >
        <div className="p-3">
          <ColorSwatches value={status.color} onChange={(c) => updateStatus(project.id, status.id, { color: c })} />
        </div>
      </Popover>
      <input
        defaultValue={status.name}
        onBlur={(e) => e.target.value.trim() && updateStatus(project.id, status.id, { name: e.target.value.trim() })}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="flex-1 bg-transparent text-sm text-white/90 outline-none min-w-0"
      />
      <span className="text-[10px] text-white/30">{count} tasks</span>
      <Popover
        width={190}
        trigger={
          <button className="flex items-center gap-1 rounded-md bg-white/6 px-2 py-1 text-[10px] font-medium text-white/60 capitalize cursor-pointer hover:bg-white/10 transition-colors">
            {status.kind}
            <Icon name="mingcute:down-line" size={11} />
          </button>
        }
      >
        <MenuList>
          {statusKinds.map((k) => (
            <MenuItem key={k.id} label={k.label} hint={k.hint} active={status.kind === k.id} onClick={() => updateStatus(project.id, status.id, { kind: k.id })} />
          ))}
        </MenuList>
      </Popover>
      <button
        onClick={() => setConfirm(true)}
        disabled={project.statuses.length <= 1}
        className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:text-rose-300 hover:bg-rose-500/12 transition-colors cursor-pointer disabled:opacity-30"
      >
        <Icon name="mingcute:delete-2-line" size={13} />
      </button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => deleteStatus(project.id, status.id)}
        title={`Delete status “${status.name}”?`}
        body={count ? `${count} tasks will move to the first remaining status.` : undefined}
      />
    </motion.div>
  );
}

function FieldRow({ project, field }: { project: Project; field: CustomFieldDef }) {
  const updateCustomField = useStore((s) => s.updateCustomField);
  const deleteCustomField = useStore((s) => s.deleteCustomField);
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = fieldTypes.find((f) => f.id === field.type);
  const hasOptions = field.type === "select" || field.type === "multiselect";

  return (
    <motion.div layout className="glass-soft rounded-xl px-3 py-2">
      <div className="flex items-center gap-2.5">
        <Icon name={field.icon || meta?.icon || "mingcute:text-line"} size={15} className="text-indigo-300 shrink-0" />
        <input
          defaultValue={field.name}
          onBlur={(e) => e.target.value.trim() && updateCustomField(project.id, field.id, { name: e.target.value.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="flex-1 bg-transparent text-sm text-white/90 outline-none min-w-0"
        />
        <Badge>{meta?.label ?? field.type}</Badge>
        {hasOptions && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-white/45 hover:text-white cursor-pointer transition-colors">
            {field.options?.length ?? 0} options
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="flex">
              <Icon name="mingcute:down-line" size={12} />
            </motion.span>
          </button>
        )}
        <button onClick={() => setConfirm(true)} className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:text-rose-300 hover:bg-rose-500/12 transition-colors cursor-pointer">
          <Icon name="mingcute:delete-2-line" size={13} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {hasOptions && expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 space-y-1.5 border-t border-white/8 pt-2">
              {(field.options ?? []).map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Popover
                    width={180}
                    trigger={<button className="h-3.5 w-3.5 rounded-full cursor-pointer ring-1 ring-white/15" style={{ backgroundColor: opt.color }} />}
                  >
                    <div className="p-3">
                      <ColorSwatches
                        value={opt.color}
                        onChange={(c) =>
                          updateCustomField(project.id, field.id, {
                            options: (field.options ?? []).map((o) => (o.id === opt.id ? { ...o, color: c } : o)),
                          })
                        }
                      />
                    </div>
                  </Popover>
                  <input
                    defaultValue={opt.label}
                    onBlur={(e) =>
                      e.target.value.trim() &&
                      updateCustomField(project.id, field.id, {
                        options: (field.options ?? []).map((o) => (o.id === opt.id ? { ...o, label: e.target.value.trim() } : o)),
                      })
                    }
                    className="flex-1 bg-transparent text-xs text-white/80 outline-none"
                  />
                  <button
                    onClick={() => updateCustomField(project.id, field.id, { options: (field.options ?? []).filter((o) => o.id !== opt.id) })}
                    className="text-white/25 hover:text-rose-300 cursor-pointer transition-colors"
                  >
                    <Icon name="mingcute:close-line" size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  updateCustomField(project.id, field.id, {
                    options: [...(field.options ?? []), { id: uid("opt"), label: `Option ${(field.options?.length ?? 0) + 1}`, color: colorPalette[(field.options?.length ?? 0) % colorPalette.length] }],
                  })
                }
                className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 cursor-pointer transition-colors"
              >
                <Icon name="mingcute:add-line" size={12} />
                Add option
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => deleteCustomField(project.id, field.id)}
        title={`Delete field “${field.name}”?`}
        body="Values stored on tasks for this field will no longer be shown."
      />
    </motion.div>
  );
}

export function ProjectSettingsModal({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const updateProject = useStore((s) => s.updateProject);
  const addStatus = useStore((s) => s.addStatus);
  const addCustomField = useStore((s) => s.addCustomField);
  const users = useStore((s) => s.users);
  const toast = useUI((s) => s.toast);
  const [tab, setTab] = useState<"general" | "statuses" | "fields" | "views">("general");

  const tabs = [
    { id: "general" as const, label: "General", icon: "mingcute:settings-3-line" },
    { id: "statuses" as const, label: "Statuses", icon: "mingcute:round-line" },
    { id: "fields" as const, label: "Custom fields", icon: "mingcute:layout-grid-line" },
    { id: "views" as const, label: "Views", icon: "mingcute:eye-2-line" },
  ];

  const sortedStatuses = [...project.statuses].sort((a, b) => a.order - b.order);

  return (
    <Modal open={open} onClose={onClose} width={640}>
      <ModalHeader title={`${project.name} — settings`} icon="mingcute:settings-3-line" onClose={onClose} />
      <div className="flex gap-1 px-5 pt-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer",
              tab === t.id ? "text-white" : "text-white/45 hover:text-white"
            )}
          >
            {tab === t.id && <motion.span layoutId="proj-settings-tab" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <Icon name={t.icon} size={14} className="relative" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-5">
        {tab === "general" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Popover
                width={250}
                trigger={
                  <button className="glass-soft glass-hover flex h-12 w-12 shrink-0 items-center justify-center rounded-xl cursor-pointer" style={{ color: project.color }}>
                    <Icon name={project.icon} size={22} />
                  </button>
                }
              >
                <div className="p-3">
                  <div className="grid grid-cols-6 gap-1">
                    {projectIcons.map((ic) => (
                      <button
                        key={ic}
                        onClick={() => updateProject(project.id, { icon: ic })}
                        className={cn("flex h-9 w-9 items-center justify-center rounded-lg cursor-pointer transition-colors", ic === project.icon ? "bg-indigo-500/25 text-indigo-200" : "text-white/60 hover:bg-white/8")}
                      >
                        <Icon name={ic} size={17} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <ColorSwatches value={project.color} onChange={(c) => updateProject(project.id, { color: c })} />
                  </div>
                </div>
              </Popover>
              <Input
                defaultValue={project.name}
                onBlur={(e) => e.target.value.trim() && updateProject(project.id, { name: e.target.value.trim() })}
                className="flex-1"
                inputSize="lg"
              />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">Description</div>
              <Textarea
                defaultValue={project.description}
                rows={3}
                onBlur={(e) => updateProject(project.id, { description: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">Members</div>
              <div className="flex items-center gap-3">
                <AvatarStack users={users.filter((u) => project.memberIds.includes(u.id))} size={28} max={8} />
                <AssigneePicker value={project.memberIds} onChange={(ids) => updateProject(project.id, { memberIds: ids })}>
                  <Button variant="subtle" size="sm" icon="mingcute:user-add-line">
                    Manage
                  </Button>
                </AssigneePicker>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">Start date</div>
                <input
                  type="date"
                  defaultValue={project.startDate ?? ""}
                  onChange={(e) => updateProject(project.id, { startDate: e.target.value || null })}
                  className="input-glass h-9 w-full px-3 text-sm"
                />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">Target date</div>
                <input
                  type="date"
                  defaultValue={project.targetDate ?? ""}
                  onChange={(e) => updateProject(project.id, { targetDate: e.target.value || null })}
                  className="input-glass h-9 w-full px-3 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {tab === "statuses" && (
          <div className="space-y-2">
            <p className="text-xs text-white/45 pb-1">Statuses define this project’s workflow. Tasks flow from open → active → done.</p>
            {sortedStatuses.map((s) => (
              <StatusRow key={s.id} project={project} status={s} />
            ))}
            <Button
              variant="subtle"
              size="sm"
              icon="mingcute:add-line"
              onClick={() => {
                addStatus(project.id, `Status ${project.statuses.length + 1}`, colorPalette[project.statuses.length % colorPalette.length], "active");
                toast("Status added");
              }}
            >
              Add status
            </Button>
          </div>
        )}

        {tab === "fields" && (
          <div className="space-y-2">
            <p className="text-xs text-white/45 pb-1">Custom fields add structured data to every task — visible in Table view and the task panel.</p>
            {project.customFields.map((f) => (
              <FieldRow key={f.id} project={project} field={f} />
            ))}
            {!project.customFields.length && <div className="py-4 text-center text-xs text-white/30">No custom fields yet</div>}
            <Popover
              width={220}
              trigger={
                <Button variant="subtle" size="sm" icon="mingcute:add-line">
                  Add field
                </Button>
              }
            >
              <MenuList>
                {fieldTypes.map((ft) => (
                  <MenuItem
                    key={ft.id}
                    icon={ft.icon}
                    label={ft.label}
                    onClick={() => {
                      addCustomField(project.id, {
                        name: `${ft.label} field`,
                        type: ft.id,
                        icon: ft.icon,
                        ...(ft.id === "select" || ft.id === "multiselect"
                          ? { options: [{ id: uid("opt"), label: "Option 1", color: colorPalette[0] }] }
                          : {}),
                      });
                      toast("Field added", { body: `${ft.label} field created` });
                    }}
                  />
                ))}
              </MenuList>
            </Popover>
          </div>
        )}

        {tab === "views" && (
          <div className="space-y-2">
            <p className="text-xs text-white/45 pb-1">Choose which views are available on this project and the default one.</p>
            {viewOptions.map((v) => {
              const enabled = project.views.includes(v.id);
              const isDefault = project.defaultView === v.id;
              return (
                <div key={v.id} className="glass-soft flex items-center gap-3 rounded-xl px-3 py-2">
                  <Icon name={v.icon} size={16} className={enabled ? "text-indigo-300" : "text-white/30"} />
                  <span className={cn("flex-1 text-sm", enabled ? "text-white/90" : "text-white/40")}>{v.label}</span>
                  {isDefault && <Badge color="#818cf8">Default</Badge>}
                  {enabled && !isDefault && (
                    <button onClick={() => updateProject(project.id, { defaultView: v.id })} className="text-[10px] text-white/40 hover:text-indigo-300 cursor-pointer transition-colors">
                      Make default
                    </button>
                  )}
                  <Checkbox
                    checked={enabled}
                    onChange={(on) => {
                      if (!on && isDefault) return;
                      const views = on
                        ? (viewOptions.map((x) => x.id).filter((id) => project.views.includes(id) || id === v.id) as ViewType[])
                        : project.views.filter((x) => x !== v.id);
                      if (!views.length) return;
                      updateProject(project.id, { views });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
