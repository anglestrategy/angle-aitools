"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn, colorPalette } from "@/lib/utils";
import type { ID, Priority } from "@/lib/types";
import { Button, Icon, Input, Textarea } from "@/components/ui/primitives";
import { MenuItem, MenuList, Modal, ModalHeader, Popover } from "@/components/ui/overlay";
import { AssigneePicker, DatePicker, PriorityPicker, TagPicker } from "@/components/fields/pickers";
import { AvatarStack, Badge } from "@/components/ui/primitives";
import { priorityMeta } from "@/lib/utils";

// ─── New Task ───────────────────────────────────────────────────────────────

export function NewTaskModal() {
  const defaults = useUI((s) => s.newTaskModal);
  const close = useUI((s) => s.closeNewTask);
  const toastFn = useUI((s) => s.toast);
  const openTaskPanel = useUI((s) => s.openTask);

  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const createTask = useStore((s) => s.createTask);
  const recentProjectIds = useStore((s) => s.recentProjectIds);

  const open = defaults !== null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<ID | null>(null);
  const [statusId, setStatusId] = useState<ID | null>(null);
  const [priority, setPriority] = useState<Priority>("none");
  const [assigneeIds, setAssigneeIds] = useState<ID[]>([]);
  const [tagIds, setTagIds] = useState<ID[]>([]);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      const pid = defaults?.projectId ?? recentProjectIds[0] ?? projects[0]?.id ?? null;
      setProjectId(pid);
      setStatusId(defaults?.statusId ?? null);
      setPriority("none");
      setAssigneeIds(defaults?.assigneeIds ?? []);
      setTagIds([]);
      setDueDate(defaults?.dueDate ?? null);
      setEstimate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const project = projects.find((p) => p.id === projectId) ?? null;

  const submit = (openAfter = false) => {
    if (!title.trim() || !project) return;
    const id = createTask({
      projectId: project.id,
      title: title.trim(),
      description: description.trim() ? `<p>${description.trim()}</p>` : "",
      statusId: statusId ?? project.statuses[0].id,
      priority,
      assigneeIds,
      tagIds,
      dueDate,
      parentId: defaults?.parentId ?? null,
      estimateHours: estimate ? parseFloat(estimate) : null,
    });
    toastFn("Task created", { body: title.trim(), icon: "mingcute:check-circle-fill" });
    close();
    if (openAfter) openTaskPanel(id);
  };

  return (
    <Modal open={open} onClose={close} width={620}>
      <ModalHeader title="New task" icon="mingcute:add-line" onClose={close} />
      <div className="p-5">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Task title"
          className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/25 outline-none"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description…"
          rows={3}
          className="mt-3 bg-white/4"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* project picker */}
          <Popover
            width={250}
            trigger={
              <button className="glass-soft glass-hover flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs font-medium text-white/85 cursor-pointer">
                {project ? (
                  <>
                    <Icon name={project.icon} size={14} style={{ color: project.color }} />
                    {project.name}
                  </>
                ) : (
                  "Pick project"
                )}
                <Icon name="mingcute:down-line" size={12} className="text-white/40" />
              </button>
            }
          >
            <MenuList>
              {projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <MenuItem
                    key={p.id}
                    icon={p.icon}
                    color={p.color}
                    label={p.name}
                    active={p.id === projectId}
                    onClick={() => {
                      setProjectId(p.id);
                      setStatusId(null);
                    }}
                  />
                ))}
            </MenuList>
          </Popover>

          {/* status */}
          {project && (
            <Popover
              width={200}
              trigger={
                <button className="glass-soft glass-hover flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs font-medium cursor-pointer" style={{ color: (project.statuses.find((s) => s.id === statusId) ?? project.statuses[0]).color }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: (project.statuses.find((s) => s.id === statusId) ?? project.statuses[0]).color }} />
                  {(project.statuses.find((s) => s.id === statusId) ?? project.statuses[0]).name}
                </button>
              }
            >
              <MenuList>
                {project.statuses.map((s) => (
                  <MenuItem key={s.id} icon="mingcute:round-fill" color={s.color} label={s.name} active={s.id === (statusId ?? project.statuses[0].id)} onClick={() => setStatusId(s.id)} />
                ))}
              </MenuList>
            </Popover>
          )}

          <PriorityPicker value={priority} onChange={setPriority}>
            <button className="glass-soft glass-hover flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs font-medium cursor-pointer" style={{ color: priorityMeta[priority].color }}>
              <Icon name={priorityMeta[priority].icon} size={13} />
              {priorityMeta[priority].label}
            </button>
          </PriorityPicker>

          <DatePicker value={dueDate} onChange={setDueDate}>
            <button className={cn("glass-soft glass-hover flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs font-medium cursor-pointer", dueDate ? "text-white/85" : "text-white/45")}>
              <Icon name="mingcute:calendar-line" size={13} />
              {dueDate ?? "Due date"}
            </button>
          </DatePicker>

          <AssigneePicker value={assigneeIds} onChange={setAssigneeIds}>
            <button className="glass-soft glass-hover flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs cursor-pointer text-white/65">
              {assigneeIds.length ? (
                <AvatarStack users={users.filter((u) => assigneeIds.includes(u.id))} size={20} />
              ) : (
                <>
                  <Icon name="mingcute:user-add-line" size={13} />
                  Assign
                </>
              )}
            </button>
          </AssigneePicker>

          <TagPicker value={tagIds} onChange={setTagIds}>
            <button className="glass-soft glass-hover flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs cursor-pointer text-white/65">
              <Icon name="mingcute:tag-line" size={13} />
              {tagIds.length ? (
                <span className="flex gap-1">
                  {tagIds.slice(0, 2).map((id) => {
                    const t = tags.find((x) => x.id === id);
                    return t ? (
                      <Badge key={id} color={t.color} size="sm">
                        {t.name}
                      </Badge>
                    ) : null;
                  })}
                  {tagIds.length > 2 && <span className="text-white/40">+{tagIds.length - 2}</span>}
                </span>
              ) : (
                "Tags"
              )}
            </button>
          </TagPicker>

          <div className="glass-soft flex items-center gap-1.5 rounded-lg px-2.5 h-8">
            <Icon name="mingcute:hourglass-line" size={13} className="text-white/45" />
            <input
              type="number"
              min={0}
              step={0.5}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="Est."
              className="w-10 bg-transparent text-xs text-white/85 outline-none placeholder:text-white/35"
            />
            <span className="text-[10px] text-white/35">h</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="subtle" size="sm" onClick={() => submit(true)} disabled={!title.trim() || !project}>
            Create & open
          </Button>
          <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => submit()} disabled={!title.trim() || !project}>
            Create task
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── New Project ────────────────────────────────────────────────────────────

const projectIcons = [
  "mingcute:folder-2-line",
  "mingcute:rocket-line",
  "mingcute:code-line",
  "mingcute:palette-line",
  "mingcute:bug-line",
  "mingcute:announcement-line",
  "mingcute:earth-line",
  "mingcute:cellphone-line",
  "mingcute:book-2-line",
  "mingcute:shopping-bag-2-line",
  "mingcute:flask-line",
  "mingcute:heartbeat-line",
];

export function NewProjectModal() {
  const spaceIdDefault = useUI((s) => s.newProjectModalSpaceId);
  const close = useUI((s) => s.closeNewProject);
  const toastFn = useUI((s) => s.toast);
  const router = useRouter();

  const spaces = useStore((s) => s.spaces);
  const createProject = useStore((s) => s.createProject);

  const open = spaceIdDefault !== null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spaceId, setSpaceId] = useState<ID | null>(null);
  const [icon, setIcon] = useState(projectIcons[0]);
  const [color, setColor] = useState(colorPalette[0]);
  const [template, setTemplate] = useState<"simple" | "dev" | "campaign">("simple");

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setSpaceId(spaceIdDefault !== "any" ? (spaceIdDefault as ID) : spaces[0]?.id ?? null);
      setIcon(projectIcons[0]);
      setColor(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
      setTemplate("simple");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const space = spaces.find((s) => s.id === spaceId);

  const submit = () => {
    if (!name.trim() || !spaceId) return;
    const id = createProject({ spaceId, name: name.trim(), icon, color, description: description.trim(), template });
    toastFn("Project created", { body: name.trim(), icon: "mingcute:folder-2-line" });
    close();
    router.push(`/app/projects/${id}`);
  };

  const templates = [
    { id: "simple" as const, label: "Simple", desc: "To Do · In Progress · Done", icon: "mingcute:checkbox-line" },
    { id: "dev" as const, label: "Software", desc: "Backlog → Review → Done", icon: "mingcute:code-line" },
    { id: "campaign" as const, label: "Campaign", desc: "Idea → Draft → Live", icon: "mingcute:announcement-line" },
  ];

  return (
    <Modal open={open} onClose={close} width={540}>
      <ModalHeader title="New project" icon="mingcute:folder-2-line" onClose={close} />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Popover
            width={260}
            trigger={
              <button className="glass-soft glass-hover flex h-12 w-12 shrink-0 items-center justify-center rounded-xl cursor-pointer" style={{ color }}>
                <Icon name={icon} size={22} />
              </button>
            }
          >
            <div className="p-3">
              <div className="grid grid-cols-6 gap-1">
                {projectIcons.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={cn("flex h-9 w-9 items-center justify-center rounded-lg cursor-pointer transition-colors", ic === icon ? "bg-indigo-500/25 text-indigo-200" : "text-white/60 hover:bg-white/8")}
                  >
                    <Icon name={ic} size={17} />
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {colorPalette.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn("h-6 w-6 rounded-full cursor-pointer transition-transform", c === color && "ring-2 ring-white/70 scale-110")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </Popover>
          <div className="flex-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Project name"
              className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/25 outline-none"
            />
            <Popover
              width={230}
              trigger={
                <button className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50 hover:text-white cursor-pointer transition-colors">
                  {space ? (
                    <>
                      <Icon name={space.icon} size={13} style={{ color: space.color }} />
                      {space.name}
                    </>
                  ) : (
                    "Pick a space"
                  )}
                  <Icon name="mingcute:down-line" size={12} />
                </button>
              }
            >
              <MenuList>
                {spaces.map((s) => (
                  <MenuItem key={s.id} icon={s.icon} color={s.color} label={s.name} active={s.id === spaceId} onClick={() => setSpaceId(s.id)} />
                ))}
              </MenuList>
            </Popover>
          </div>
        </div>

        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" rows={2} />

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">Workflow template</div>
          <div className="grid grid-cols-3 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={cn(
                  "glass-soft rounded-xl p-3 text-left cursor-pointer transition-all",
                  template === t.id ? "border-indigo-400/40 bg-indigo-500/12" : "glass-hover"
                )}
              >
                <Icon name={t.icon} size={17} className={template === t.id ? "text-indigo-300" : "text-white/55"} />
                <div className="mt-1.5 text-xs font-semibold text-white/90">{t.label}</div>
                <div className="mt-0.5 text-[10px] text-white/40 leading-snug">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={submit} disabled={!name.trim() || !spaceId}>
            Create project
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── New Space ──────────────────────────────────────────────────────────────

const spaceIcons = [
  "mingcute:box-3-line",
  "mingcute:rocket-line",
  "mingcute:palette-line",
  "mingcute:settings-3-line",
  "mingcute:briefcase-line",
  "mingcute:building-2-line",
  "mingcute:heart-line",
  "mingcute:globe-2-line",
];

export function NewSpaceModal() {
  const open = useUI((s) => s.newSpaceModalOpen);
  const setOpen = useUI((s) => s.setNewSpaceModal);
  const toastFn = useUI((s) => s.toast);
  const router = useRouter();
  const createSpace = useStore((s) => s.createSpace);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(spaceIcons[0]);
  const [color, setColor] = useState(colorPalette[0]);
  const [priv, setPriv] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIcon(spaceIcons[0]);
      setColor(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
      setPriv(false);
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    const id = createSpace({ name: name.trim(), icon, color, description: description.trim(), private: priv });
    toastFn("Space created", { body: name.trim(), icon: "mingcute:box-3-line" });
    setOpen(false);
    router.push(`/app/spaces/${id}`);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} width={480}>
      <ModalHeader title="New space" icon="mingcute:box-3-line" onClose={() => setOpen(false)} />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22`, color }}>
            <Icon name={icon} size={22} />
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Space name"
            className="flex-1 bg-transparent text-lg font-semibold text-white placeholder:text-white/25 outline-none"
          />
        </div>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What lives in this space?" rows={2} />
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">Icon</div>
          <div className="flex flex-wrap gap-1.5">
            {spaceIcons.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={cn("flex h-9 w-9 items-center justify-center rounded-lg cursor-pointer transition-colors", ic === icon ? "bg-indigo-500/25 text-indigo-200" : "glass-soft text-white/60 hover:bg-white/10")}
              >
                <Icon name={ic} size={17} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">Color</div>
          <div className="flex flex-wrap gap-1.5">
            {colorPalette.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={cn("h-7 w-7 rounded-full cursor-pointer transition-transform", c === color && "ring-2 ring-white/70 scale-110")} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <button onClick={() => setPriv(!priv)} className="flex w-full items-center gap-3 glass-soft glass-hover rounded-xl px-3.5 py-2.5 cursor-pointer">
          <Icon name={priv ? "mingcute:lock-fill" : "mingcute:lock-line"} size={16} className={priv ? "text-indigo-300" : "text-white/50"} />
          <span className="flex-1 text-left">
            <span className="block text-xs font-medium text-white/90">Private space</span>
            <span className="block text-[10px] text-white/40">Only invited members can see it</span>
          </span>
          <span className={cn("h-4 w-4 rounded-full border transition-colors", priv ? "accent-gradient border-transparent" : "border-white/30")} />
        </button>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={submit} disabled={!name.trim()}>
            Create space
          </Button>
        </div>
      </div>
    </Modal>
  );
}
