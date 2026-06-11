"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Attachment, CustomFieldDef, ID, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { taskProgress } from "@/lib/selectors";
import {
  cn,
  dueState,
  dueStateColor,
  formatDate,
  formatDateTime,
  formatDuration,
  hashIndex,
  isDone,
  timeAgo,
  todayStr,
} from "@/lib/utils";
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Icon,
  IconButton,
  Input,
  ProgressBar,
  SectionLabel,
} from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuLabel, MenuList, MenuSeparator, Popover, Tooltip } from "@/components/ui/overlay";
import {
  AssigneePicker,
  DatePicker,
  PriorityPicker,
  StatusPicker,
  TagChips,
  TagPicker,
  UserName,
} from "@/components/fields/pickers";
import { CommentComposer, CommentsSection } from "./CommentComposer";
import { ActivityFeed } from "./ActivityFeed";

// ─── Small helpers ──────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 340, damping: 34 };

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asNumber = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asIds = (v: unknown): ID[] => (Array.isArray(v) ? v.filter((x): x is ID => typeof x === "string") : []);

const ATTACHMENT_ICONS: Record<Attachment["type"], string> = {
  image: "mingcute:pic-line",
  pdf: "mingcute:pdf-line",
  doc: "mingcute:doc-line",
  sheet: "mingcute:table-2-line",
  figma: "mingcute:figma-line",
  zip: "mingcute:file-zip-line",
  other: "mingcute:attachment-2-line",
};

const ATTACHMENT_TYPES: Attachment["type"][] = ["image", "pdf", "doc", "sheet", "figma", "zip", "other"];

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function inferAttachmentType(name: string): Attachment["type"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "txt", "md", "rtf", "pages"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "sheet";
  if (ext === "fig") return "figma";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "zip";
  return "other";
}

/** parse "1h 30m" / "90m" / "1.5h" / "90" → minutes */
function parseDurationInput(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/,/g, ".");
  if (!s || !/\d/.test(s)) return null;
  const re = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)?/g;
  let total = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    matched = true;
    const n = parseFloat(m[1]);
    total += m[2]?.startsWith("h") ? n * 60 : n;
  }
  if (!matched || total <= 0) return null;
  return Math.round(total);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlToPlain(html: string): string {
  let s = html;
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "• ");
  s = s.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

function plainToHtml(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join("");
}

function useElapsedMins(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return 0;
  const started = new Date(startedAt).getTime();
  return Math.max(1, Math.round((Math.max(now, started) - started) / 60_000));
}

// ─── Inline value inputs ────────────────────────────────────────────────────

function InlineNumberInput({
  value,
  onCommit,
  prefix,
  suffix,
  placeholder = "Empty",
  min,
  max,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    // value changed in the store → adopt it (render-time adjustment)
    setLastValue(value);
    setDraft(value === null ? "" : String(value));
  }
  const commit = () => {
    const t = draft.trim();
    if (!t) {
      if (value !== null) onCommit(null);
      return;
    }
    let n = Number(t);
    if (Number.isNaN(n)) {
      setDraft(value === null ? "" : String(value));
      return;
    }
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    if (n !== value) onCommit(n);
    else setDraft(String(n));
  };
  return (
    <span className="flex items-center gap-0.5 text-xs">
      {prefix && <span className="text-white/40">{prefix}</span>}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
        inputMode="decimal"
        className="w-16 rounded-lg bg-transparent px-2 py-1 text-xs text-white/85 transition-colors placeholder:text-white/30 hover:bg-white/6 focus:bg-white/8 focus:outline-none"
      />
      {suffix && value !== null && <span className="text-white/40">{suffix}</span>}
    </span>
  );
}

function InlineTextInput({
  value,
  onCommit,
  placeholder = "Empty",
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== value) onCommit(draft.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder}
      className={cn(
        "w-full min-w-0 rounded-lg bg-transparent px-2 py-1 text-xs text-white/85 transition-colors placeholder:text-white/30 hover:bg-white/6 focus:bg-white/8 focus:outline-none",
        className
      )}
    />
  );
}

// ─── Property grid ──────────────────────────────────────────────────────────

function PropertyRow({
  icon,
  label,
  children,
  full,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("flex min-h-[32px] items-center gap-2", full && "sm:col-span-2")}>
      <div className="flex w-[106px] shrink-0 items-center gap-1.5 text-[11px] font-medium text-white/40">
        <Icon name={icon} size={13} className="shrink-0 text-white/30" />
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const pickerTriggerCls =
  "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/8";

// ─── Custom field controls ──────────────────────────────────────────────────

function CustomFieldControl({ field, task }: { field: CustomFieldDef; task: Task }) {
  const updateTask = useStore((s) => s.updateTask);
  const setValue = (v: unknown) =>
    updateTask(task.id, { customFieldValues: { ...task.customFieldValues, [field.id]: v } });
  const raw = task.customFieldValues[field.id];

  switch (field.type) {
    case "text":
      return <InlineTextInput value={asString(raw)} onCommit={(v) => setValue(v || null)} />;

    case "url": {
      const v = asString(raw);
      return (
        <span className="flex min-w-0 items-center gap-1">
          <InlineTextInput value={v} onCommit={(x) => setValue(x || null)} placeholder="https://…" className="text-indigo-300" />
          {v && (
            <a
              href={v.startsWith("http") ? v : `https://${v}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-white/40 transition-colors hover:text-white"
              title="Open link"
            >
              <Icon name="mingcute:external-link-line" size={13} />
            </a>
          )}
        </span>
      );
    }

    case "number":
      return <InlineNumberInput value={asNumber(raw)} onCommit={setValue} />;

    case "currency":
      return <InlineNumberInput prefix="$" value={asNumber(raw)} onCommit={setValue} min={0} />;

    case "date":
      return <DatePicker value={asString(raw) || null} onChange={(d) => setValue(d)} placeholder="Set date" />;

    case "checkbox":
      return <Checkbox size="sm" checked={raw === true} onChange={(v) => setValue(v)} className="ml-2" />;

    case "rating": {
      const v = asNumber(raw) ?? 0;
      return (
        <div className="flex items-center gap-0.5 px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => setValue(i === v ? 0 : i)}
              className="cursor-pointer p-0.5 transition-transform hover:scale-110"
              aria-label={`Rate ${i}`}
            >
              <Icon
                name={i <= v ? "mingcute:star-fill" : "mingcute:star-line"}
                size={15}
                className={i <= v ? "text-amber-300" : "text-white/25"}
              />
            </button>
          ))}
        </div>
      );
    }

    case "select": {
      const current = field.options?.find((o) => o.id === asString(raw));
      return (
        <Popover
          width={210}
          trigger={
            <button className={pickerTriggerCls}>
              {current ? (
                <Badge color={current.color}>{current.label}</Badge>
              ) : (
                <span className="text-white/40">Empty</span>
              )}
            </button>
          }
        >
          <MenuList>
            <MenuLabel>{field.name}</MenuLabel>
            {(field.options ?? []).map((o) => (
              <MenuItem
                key={o.id}
                icon="mingcute:round-fill"
                color={o.color}
                label={o.label}
                active={o.id === current?.id}
                onClick={() => setValue(o.id === current?.id ? null : o.id)}
              />
            ))}
          </MenuList>
        </Popover>
      );
    }

    case "multiselect": {
      const selected = asIds(raw);
      const opts = field.options ?? [];
      const chosen = opts.filter((o) => selected.includes(o.id));
      return (
        <Popover
          width={220}
          trigger={
            <button className={cn(pickerTriggerCls, "flex-wrap gap-y-1")}>
              {chosen.length ? (
                chosen.map((o) => (
                  <Badge key={o.id} color={o.color} size="sm">
                    {o.label}
                  </Badge>
                ))
              ) : (
                <span className="text-white/40">Empty</span>
              )}
            </button>
          }
        >
          <MenuList>
            <MenuLabel>{field.name}</MenuLabel>
            {opts.map((o) => (
              <MenuItem
                key={o.id}
                icon="mingcute:round-fill"
                color={o.color}
                label={o.label}
                active={selected.includes(o.id)}
                onClick={(e) => {
                  e.preventDefault();
                  setValue(selected.includes(o.id) ? selected.filter((x) => x !== o.id) : [...selected, o.id]);
                }}
              />
            ))}
          </MenuList>
        </Popover>
      );
    }

    case "people": {
      const ids = asIds(raw);
      return <PeopleValue ids={ids} onChange={(v) => setValue(v)} />;
    }

    case "progress": {
      const v = asNumber(raw) ?? 0;
      return (
        <div className="flex items-center gap-2 pr-2">
          <InlineNumberInput
            value={asNumber(raw)}
            onCommit={(n) => setValue(n === null ? null : Math.min(100, Math.max(0, n)))}
            min={0}
            max={100}
            suffix="%"
          />
          <ProgressBar value={v} className="max-w-[90px] flex-1" height={5} />
        </div>
      );
    }
  }
}

function PeopleValue({ ids, onChange }: { ids: ID[]; onChange: (ids: ID[]) => void }) {
  const users = useStore((s) => s.users);
  const selected = users.filter((u) => ids.includes(u.id));
  return (
    <AssigneePicker value={ids} onChange={onChange} triggerClassName="max-w-full">
      <button className={pickerTriggerCls}>
        {selected.length ? (
          <>
            <AvatarStack users={selected} size={18} max={4} />
            <span className="truncate text-white/75">{selected.map((u) => u.name.split(" ")[0]).join(", ")}</span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-white/40">
            <Icon name="mingcute:user-add-line" size={13} />
            Empty
          </span>
        )}
      </button>
    </AssigneePicker>
  );
}

// ─── Title ──────────────────────────────────────────────────────────────────

function TitleEditor({ task, done }: { task: Task; done: boolean }) {
  const updateTask = useStore((s) => s.updateTask);
  const [title, setTitle] = useState(task.title);
  const [lastTitle, setLastTitle] = useState(task.title);
  const ref = useRef<HTMLTextAreaElement>(null);

  if (lastTitle !== task.title) {
    setLastTitle(task.title);
    setTitle(task.title);
  }
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  const commit = () => {
    const t = title.trim();
    if (!t) {
      setTitle(task.title);
      return;
    }
    if (t !== task.title) updateTask(task.id, { title: t });
  };

  return (
    <textarea
      ref={ref}
      value={title}
      rows={1}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      placeholder="Task title"
      className={cn(
        "-mx-1.5 w-full resize-none rounded-lg bg-transparent px-1.5 py-0.5 text-xl font-semibold leading-snug transition-colors placeholder:text-white/30 hover:bg-white/4 focus:bg-white/5 focus:outline-none",
        done ? "text-white/45 line-through" : "text-white/95"
      )}
    />
  );
}

// ─── Description ────────────────────────────────────────────────────────────

function DescriptionSection({ task }: { task: Task }) {
  const updateTask = useStore((s) => s.updateTask);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => {
    setDraft(htmlToPlain(task.description));
    setEditing(true);
  };
  const save = () => {
    updateTask(task.id, { description: plainToHtml(draft) });
    setEditing(false);
  };

  return (
    <section className="group/desc border-t border-white/8 px-5 py-4">
      <div className="flex items-center gap-2">
        <SectionLabel>Description</SectionLabel>
        {!editing && (
          <IconButton
            size="xs"
            icon="mingcute:pencil-line"
            label="Edit description"
            className="opacity-0 transition-opacity group-hover/desc:opacity-100"
            onClick={start}
          />
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="Write something…"
            className="input-glass min-h-[120px] w-full resize-y px-3 py-2.5 text-[13px] leading-relaxed"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={save}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <span className="ml-auto text-[10px] text-white/25">⌘↵ to save</span>
          </div>
        </div>
      ) : task.description ? (
        <div
          className="prose-glass mt-2 cursor-text rounded-lg transition-colors"
          onDoubleClick={start}
          dangerouslySetInnerHTML={{ __html: task.description }}
        />
      ) : (
        <button
          onClick={start}
          className="mt-2 w-full cursor-text rounded-lg border border-dashed border-white/10 px-3 py-3 text-left text-[13px] text-white/30 transition-colors hover:border-white/20 hover:text-white/45"
        >
          Write something…
        </button>
      )}
    </section>
  );
}

// ─── Checklist ──────────────────────────────────────────────────────────────

function ChecklistSection({ task }: { task: Task }) {
  const addChecklistItem = useStore((s) => s.addChecklistItem);
  const toggleChecklistItem = useStore((s) => s.toggleChecklistItem);
  const deleteChecklistItem = useStore((s) => s.deleteChecklistItem);
  const [text, setText] = useState("");

  const done = task.checklist.filter((c) => c.done).length;
  const total = task.checklist.length;

  const add = () => {
    const t = text.trim();
    if (!t) return;
    addChecklistItem(task.id, t);
    setText("");
  };

  return (
    <section className="border-t border-white/8 px-5 py-4">
      <div className="flex items-center gap-3">
        <SectionLabel>Checklist</SectionLabel>
        {total > 0 && (
          <>
            <span className="text-[11px] font-medium tabular-nums text-white/45">
              {done}/{total}
            </span>
            <ProgressBar value={(done / total) * 100} color="#34d399" className="w-24" height={4} />
          </>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        {task.checklist.map((item) => (
          <div
            key={item.id}
            className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
          >
            <Checkbox size="sm" checked={item.done} onChange={() => toggleChecklistItem(task.id, item.id)} />
            <span className={cn("flex-1 text-[13px]", item.done ? "text-white/35 line-through" : "text-white/85")}>
              {item.text}
            </span>
            <IconButton
              size="xs"
              icon="mingcute:delete-2-line"
              label="Delete item"
              className="opacity-0 transition-opacity group-hover:opacity-100 hover:!text-rose-300"
              onClick={() => deleteChecklistItem(task.id, item.id)}
            />
          </div>
        ))}

        <div className="-mx-2 flex items-center gap-2.5 px-2 py-1">
          <Icon name="mingcute:add-line" size={15} className="shrink-0 text-white/30" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="Add checklist item…"
            className="w-full bg-transparent py-0.5 text-[13px] text-white/85 placeholder:text-white/30 focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Subtasks ───────────────────────────────────────────────────────────────

function SubtasksSection({ task }: { task: Task }) {
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const projects = useStore((s) => s.projects);
  const createTask = useStore((s) => s.createTask);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const openTask = useUI((s) => s.openTask);
  const [title, setTitle] = useState("");

  const project = projects.find((p) => p.id === task.projectId);
  const subtasks = useMemo(
    () => tasks.filter((t) => t.parentId === task.id && !t.archived).sort((a, b) => a.order - b.order),
    [tasks, task.id]
  );
  const doneCount = project ? subtasks.filter((s) => isDone(s, project.statuses)).length : 0;
  const progress = project && subtasks.length ? taskProgress(task, subtasks, project.statuses) : 0;

  const add = () => {
    const t = title.trim();
    if (!t) return;
    createTask({ projectId: task.projectId, parentId: task.id, title: t });
    setTitle("");
  };

  return (
    <section className="border-t border-white/8 px-5 py-4">
      <div className="flex items-center gap-3">
        <SectionLabel>Subtasks</SectionLabel>
        {subtasks.length > 0 && (
          <>
            <span className="text-[11px] font-medium tabular-nums text-white/45">
              {doneCount}/{subtasks.length}
            </span>
            <ProgressBar value={progress} className="w-24" height={4} />
          </>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        {subtasks.map((st) => {
          const stDone = project ? isDone(st, project.statuses) : false;
          const assignees = users.filter((u) => st.assigneeIds.includes(u.id));
          const ds = dueState(st.dueDate, !!st.completedAt);
          return (
            <div
              key={st.id}
              className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
            >
              <Checkbox size="sm" checked={stDone} onChange={() => toggleTaskComplete(st.id)} />
              <button
                onClick={() => openTask(st.id)}
                className={cn(
                  "min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] transition-colors",
                  stDone ? "text-white/35 line-through" : "text-white/85 hover:text-white"
                )}
              >
                {st.title}
              </button>
              {st.dueDate && (
                <span className={cn("whitespace-nowrap text-[11px]", dueStateColor[ds])}>{formatDate(st.dueDate)}</span>
              )}
              {assignees.length > 0 && <AvatarStack users={assignees} size={18} max={3} />}
              <Icon
                name="mingcute:right-line"
                size={13}
                className="text-white/20 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
          );
        })}

        <div className="-mx-2 flex items-center gap-2.5 px-2 py-1">
          <Icon name="mingcute:add-line" size={15} className="shrink-0 text-white/30" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="Add subtask…"
            className="w-full bg-transparent py-0.5 text-[13px] text-white/85 placeholder:text-white/30 focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Attachments ────────────────────────────────────────────────────────────

function AttachmentAdder({ task }: { task: Task }) {
  const addAttachment = useStore((s) => s.addAttachment);
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState("");
  const [type, setType] = useState<Attachment["type"]>("other");
  const [touched, setTouched] = useState(false);

  const submit = (close: () => void) => {
    const n = name.trim();
    if (!n) return;
    // deterministic pseudo-random demo size derived from the file name
    addAttachment(task.id, n, 64 + hashIndex(n, 4160), type);
    toast("Attachment added", { body: n, icon: "mingcute:attachment-2-line" });
    setName("");
    setType("other");
    setTouched(false);
    close();
  };

  return (
    <Popover
      width={268}
      align="end"
      trigger={
        <Button size="xs" variant="subtle" icon="mingcute:add-line">
          Add
        </Button>
      }
    >
      {(close) => (
        <div className="space-y-2.5 p-3">
          <SectionLabel>Add attachment</SectionLabel>
          <Input
            autoFocus
            inputSize="sm"
            placeholder="File name, e.g. spec-v4.pdf"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!touched) setType(inferAttachmentType(e.target.value));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(close);
            }}
            className="w-full"
          />
          <div className="flex flex-wrap gap-1">
            {ATTACHMENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setTouched(true);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium capitalize transition-colors",
                  type === t
                    ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
                    : "border-white/10 bg-white/4 text-white/55 hover:bg-white/8"
                )}
              >
                <Icon name={ATTACHMENT_ICONS[t]} size={11} />
                {t}
              </button>
            ))}
          </div>
          <Button size="sm" variant="primary" className="w-full" disabled={!name.trim()} onClick={() => submit(close)}>
            Attach
          </Button>
          <p className="text-[10px] leading-relaxed text-white/30">Demo upload — file contents aren’t stored.</p>
        </div>
      )}
    </Popover>
  );
}

function AttachmentsSection({ task }: { task: Task }) {
  const users = useStore((s) => s.users);
  const deleteAttachment = useStore((s) => s.deleteAttachment);

  return (
    <section className="border-t border-white/8 px-5 py-4">
      <div className="flex items-center gap-3">
        <SectionLabel>
          Attachments{task.attachments.length > 0 && ` (${task.attachments.length})`}
        </SectionLabel>
        <span className="flex-1" />
        <AttachmentAdder task={task} />
      </div>

      {task.attachments.length > 0 && (
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {task.attachments.map((a) => {
            const uploader = users.find((u) => u.id === a.uploadedBy);
            return (
              <div key={a.id} className="glass-soft group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/6">
                  <Icon name={ATTACHMENT_ICONS[a.type]} size={16} className="text-indigo-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-white/85">{a.name}</div>
                  <div className="text-[10px] text-white/35">
                    {formatSize(a.sizeKb)} · {timeAgo(a.uploadedAt)}
                  </div>
                </div>
                {uploader && <Avatar user={uploader} size={18} />}
                <button
                  onClick={() => deleteAttachment(task.id, a.id)}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-rose-500/90 text-white shadow-md transition-transform hover:scale-110 group-hover:flex"
                  aria-label={`Delete ${a.name}`}
                >
                  <Icon name="mingcute:close-line" size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Time tab ───────────────────────────────────────────────────────────────

function LogTimeForm({ taskId }: { taskId: ID }) {
  const addTimeEntry = useStore((s) => s.addTimeEntry);
  const toast = useUI((s) => s.toast);
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<string | null>(todayStr());
  const [billable, setBillable] = useState(true);

  const parsed = parseDurationInput(duration);
  const submit = () => {
    if (!parsed) return;
    addTimeEntry(taskId, parsed, note.trim(), date ?? todayStr(), billable);
    toast("Time logged", { body: formatDuration(parsed), icon: "mingcute:time-line" });
    setDuration("");
    setNote("");
  };

  return (
    <div className="glass-soft space-y-2 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <Input
          inputSize="sm"
          placeholder="1h 30m"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="w-24 shrink-0"
        />
        <Input
          inputSize="sm"
          placeholder="What did you work on?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="min-w-0 flex-1"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <DatePicker value={date} onChange={setDate} placeholder="Today" />
        <button
          onClick={() => setBillable(!billable)}
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
            billable
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
              : "border-white/10 bg-white/4 text-white/45 hover:bg-white/8"
          )}
        >
          <Icon name="mingcute:currency-dollar-line" size={12} />
          Billable
        </button>
        <span className="flex-1" />
        {duration.trim() && !parsed && <span className="text-[10px] text-rose-300">Try “1h 30m” or “90m”</span>}
        <Button size="sm" variant="primary" icon="mingcute:add-line" disabled={!parsed} onClick={submit}>
          Log time
        </Button>
      </div>
    </div>
  );
}

function TimeTab({ task }: { task: Task }) {
  const timeEntries = useStore((s) => s.timeEntries);
  const users = useStore((s) => s.users);
  const runningTimer = useStore((s) => s.runningTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const deleteTimeEntry = useStore((s) => s.deleteTimeEntry);
  const toast = useUI((s) => s.toast);

  const entries = useMemo(
    () =>
      timeEntries
        .filter((e) => e.taskId === task.id)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    [timeEntries, task.id]
  );
  const total = entries.reduce((s, e) => s + e.durationMins, 0);
  const billableTotal = entries.filter((e) => e.billable).reduce((s, e) => s + e.durationMins, 0);

  const isTiming = runningTimer?.taskId === task.id;
  const elapsed = useElapsedMins(isTiming ? runningTimer.startedAt : null);

  return (
    <div className="space-y-3">
      {isTiming && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="flex-1 text-xs text-emerald-200">
            Timer running — <span className="font-semibold tabular-nums">{formatDuration(elapsed)}</span>
          </span>
          <Button
            size="xs"
            variant="subtle"
            icon="mingcute:stop-fill"
            onClick={() => {
              stopTimer();
              toast("Timer stopped", { body: `Logged ${formatDuration(elapsed)}`, icon: "mingcute:time-line" });
            }}
          >
            Stop
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-soft rounded-xl px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Total tracked</div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-white/90">{formatDuration(total)}</div>
        </div>
        <div className="glass-soft rounded-xl px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Billable</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-base font-semibold tabular-nums text-emerald-300">{formatDuration(billableTotal)}</span>
            {total > 0 && (
              <span className="text-[10px] text-white/35">{Math.round((billableTotal / total) * 100)}%</span>
            )}
          </div>
        </div>
      </div>

      <LogTimeForm taskId={task.id} />

      {entries.length ? (
        <div className="space-y-0.5">
          {entries.map((e) => {
            const u = users.find((x) => x.id === e.userId);
            return (
              <div
                key={e.id}
                className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
              >
                {u && <Avatar user={u} size={22} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-white/80">{e.note || "Tracked time"}</div>
                  <div className="text-[10px] text-white/35">
                    {formatDate(e.date)} · <UserName userId={e.userId} />
                  </div>
                </div>
                {e.billable && (
                  <Badge color="#34d399" size="sm">
                    Billable
                  </Badge>
                )}
                <span className="text-xs font-semibold tabular-nums text-white/85">{formatDuration(e.durationMins)}</span>
                <IconButton
                  size="xs"
                  icon="mingcute:delete-2-line"
                  label="Delete entry"
                  className="opacity-0 transition-opacity group-hover:opacity-100 hover:!text-rose-300"
                  onClick={() => deleteTimeEntry(e.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="mingcute:time-line"
          title="No time logged"
          body="Log time manually above, or start the timer from the panel header."
          className="py-6"
        />
      )}
    </div>
  );
}

// ─── ⋯ menu (with move-to-project submenu) ──────────────────────────────────

function TaskMenu({ task, onRequestDelete }: { task: Task; onRequestDelete: () => void }) {
  const projects = useStore((s) => s.projects);
  const duplicateTask = useStore((s) => s.duplicateTask);
  const moveTaskToProject = useStore((s) => s.moveTaskToProject);
  const updateTask = useStore((s) => s.updateTask);
  const closeTask = useUI((s) => s.closeTask);
  const toast = useUI((s) => s.toast);
  const [view, setView] = useState<"root" | "move">("root");

  const others = projects.filter((p) => p.id !== task.projectId && !p.archived);

  return (
    <Popover
      width={236}
      align="end"
      onOpenChange={(o) => {
        if (!o) setView("root");
      }}
      trigger={<IconButton size="sm" icon="mingcute:more-2-line" label="More actions" />}
    >
      {view === "root" ? (
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
            icon="mingcute:transfer-line"
            label="Move to project"
            onClick={(e) => {
              e.preventDefault();
              setView("move");
            }}
            trailing={<Icon name="mingcute:right-line" size={13} className="text-white/30" />}
          />
          <MenuItem
            icon="mingcute:archive-line"
            label="Archive"
            onClick={() => {
              updateTask(task.id, { archived: true });
              closeTask();
              toast("Task archived", { icon: "mingcute:archive-line", kind: "info" });
            }}
          />
          <MenuSeparator />
          <MenuItem icon="mingcute:delete-2-line" label="Delete task" danger onClick={onRequestDelete} />
        </MenuList>
      ) : (
        <MenuList>
          <MenuItem
            icon="mingcute:left-line"
            label={<span className="text-white/50">Back</span>}
            onClick={(e) => {
              e.preventDefault();
              setView("root");
            }}
          />
          <MenuSeparator />
          <MenuLabel>Move to project</MenuLabel>
          {others.map((p) => (
            <MenuItem
              key={p.id}
              icon={p.icon}
              color={p.color}
              label={p.name}
              onClick={() => {
                moveTaskToProject(task.id, p.id);
                toast(`Moved to ${p.name}`, { icon: "mingcute:transfer-line" });
              }}
            />
          ))}
          {!others.length && <div className="px-3 py-3 text-center text-xs text-white/35">No other projects</div>}
        </MenuList>
      )}
    </Popover>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

type TabId = "comments" | "activity" | "time";

function TaskPanelInner({ task }: { task: Task }) {
  const router = useRouter();
  const projects = useStore((s) => s.projects);
  const spaces = useStore((s) => s.spaces);
  const users = useStore((s) => s.users);
  const tags = useStore((s) => s.tags);
  const tasks = useStore((s) => s.tasks);
  const comments = useStore((s) => s.comments);
  const timeEntries = useStore((s) => s.timeEntries);
  const runningTimer = useStore((s) => s.runningTimer);
  const me = useStore((s) => s.currentUserId) ?? "u_ava";

  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const startTimer = useStore((s) => s.startTimer);
  const stopTimer = useStore((s) => s.stopTimer);

  const closeTask = useUI((s) => s.closeTask);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);

  // tab resets to "comments" whenever the panel switches to another task
  const [tabState, setTabState] = useState<{ taskId: ID; tab: TabId }>({ taskId: task.id, tab: "comments" });
  const tab: TabId = tabState.taskId === task.id ? tabState.tab : "comments";
  const setTab = (t: TabId) => setTabState({ taskId: task.id, tab: t });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = projects.find((p) => p.id === task.projectId);
  const space = spaces.find((s) => s.id === project?.spaceId);
  const parent = task.parentId ? tasks.find((t) => t.id === task.parentId) : undefined;
  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));
  const watchers = users.filter((u) => task.watcherIds.includes(u.id));
  const done = project ? isDone(task, project.statuses) : !!task.completedAt;
  const watching = task.watcherIds.includes(me);

  const commentCount = useMemo(() => comments.filter((c) => c.taskId === task.id).length, [comments, task.id]);
  const entryCount = useMemo(() => timeEntries.filter((e) => e.taskId === task.id).length, [timeEntries, task.id]);

  const isTiming = runningTimer?.taskId === task.id;
  const elapsed = useElapsedMins(isTiming ? runningTimer.startedAt : null);

  // Escape closes (not while typing, not while the delete dialog is up)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || confirmDelete) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      closeTask();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTask, confirmDelete]);

  const copyLink = () => {
    const url = `${window.location.origin}/app/projects/${task.projectId}?task=${task.id}`;
    try {
      void navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable */
    }
    toast("Link copied to clipboard", { icon: "mingcute:link-2-line" });
  };

  const goToProject = () => {
    if (!project) return;
    closeTask();
    router.push(`/app/projects/${project.id}`);
  };

  const toggleWatch = () => {
    updateTask(task.id, {
      watcherIds: watching ? task.watcherIds.filter((w) => w !== me) : [...task.watcherIds, me],
    });
    toast(watching ? "Stopped watching" : "Watching this task", { icon: "mingcute:eye-2-line", kind: "info" });
  };

  const tabs: { id: TabId; label: string; icon: string; count?: number }[] = [
    { id: "comments", label: "Comments", icon: "mingcute:message-2-line", count: commentCount },
    { id: "activity", label: "Activity", icon: "mingcute:history-line" },
    { id: "time", label: "Time", icon: "mingcute:time-line", count: entryCount },
  ];

  return (
    <>
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
        onClick={closeTask}
      />

      {/* slide-over */}
      <motion.aside
        initial={{ x: 720 }}
        animate={{ x: 0 }}
        exit={{ x: 720 }}
        transition={SPRING}
        className="glass-strong fixed bottom-3 right-3 top-3 z-[70] flex w-[640px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-label={task.title}
      >
        {/* ── header bar ── */}
        <header className="flex shrink-0 items-center gap-1 border-b border-white/8 px-4 py-2.5">
          <button
            onClick={goToProject}
            className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs transition-colors hover:bg-white/6"
            title={project ? `Open ${project.name}` : undefined}
          >
            {space && (
              <>
                <span className="truncate text-white/40">{space.name}</span>
                <Icon name="mingcute:right-line" size={11} className="shrink-0 text-white/25" />
              </>
            )}
            {project && (
              <>
                <Icon name={project.icon} size={14} className="shrink-0" style={{ color: project.color }} />
                <span className="truncate font-medium text-white/70">{project.name}</span>
              </>
            )}
          </button>

          <span className="flex-1" />

          <Tooltip label="Copy link">
            <IconButton size="sm" icon="mingcute:link-2-line" label="Copy link" onClick={copyLink} />
          </Tooltip>

          {isTiming ? (
            <button
              onClick={() => {
                stopTimer();
                toast("Timer stopped", { body: `Logged ${formatDuration(elapsed)}`, icon: "mingcute:time-line" });
              }}
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
              title="Stop timer"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="tabular-nums">{formatDuration(elapsed)}</span>
              <Icon name="mingcute:stop-fill" size={12} />
            </button>
          ) : (
            <Tooltip label="Start timer">
              <IconButton
                size="sm"
                icon="mingcute:play-fill"
                label="Start timer"
                onClick={() => {
                  startTimer(task.id);
                  toast("Timer started", { body: task.title, icon: "mingcute:play-fill" });
                }}
              />
            </Tooltip>
          )}

          <Tooltip label={watching ? "Stop watching" : "Watch"}>
            <IconButton
              size="sm"
              icon={watching ? "mingcute:eye-2-line" : "mingcute:eye-close-line"}
              label={watching ? "Stop watching" : "Watch task"}
              active={watching}
              onClick={toggleWatch}
            />
          </Tooltip>

          <TaskMenu task={task} onRequestDelete={() => setConfirmDelete(true)} />

          <div className="mx-1 h-5 w-px bg-white/10" />
          <IconButton size="sm" icon="mingcute:close-line" label="Close panel" onClick={closeTask} />
        </header>

        {/* ── scrollable body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* title block */}
          <div className="px-5 pb-4 pt-4">
            {parent && (
              <button
                onClick={() => openTask(parent.id)}
                className="mb-2 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon name="mingcute:git-branch-line" size={12} className="shrink-0 text-indigo-300" />
                <span className="shrink-0">Subtask of:</span>
                <span className="truncate font-medium text-white/75">{parent.title}</span>
              </button>
            )}

            <div className="flex items-start gap-3">
              <Checkbox checked={done} onChange={() => toggleTaskComplete(task.id)} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <TitleEditor task={task} done={done} />
              </div>
            </div>

            {/* properties grid */}
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-0.5 sm:grid-cols-2">
              <PropertyRow icon="mingcute:round-line" label="Status">
                {project && (
                  <StatusPicker
                    project={project}
                    value={task.statusId}
                    onChange={(statusId) => updateTask(task.id, { statusId })}
                  />
                )}
              </PropertyRow>

              <PropertyRow icon="mingcute:user-3-line" label="Assignees">
                <AssigneePicker
                  value={task.assigneeIds}
                  onChange={(ids) => updateTask(task.id, { assigneeIds: ids })}
                  triggerClassName="max-w-full"
                >
                  <button className={pickerTriggerCls}>
                    {assignees.length ? (
                      <>
                        <AvatarStack users={assignees} size={20} max={4} />
                        <span className="truncate text-white/75">
                          {assignees.map((u) => u.name.split(" ")[0]).join(", ")}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1.5 text-white/40">
                        <Icon name="mingcute:user-add-line" size={14} />
                        Assign
                      </span>
                    )}
                  </button>
                </AssigneePicker>
              </PropertyRow>

              <PropertyRow icon="mingcute:flag-2-line" label="Priority">
                <PriorityPicker value={task.priority} onChange={(priority) => updateTask(task.id, { priority })} />
              </PropertyRow>

              <PropertyRow icon="mingcute:calendar-line" label="Start date">
                <DatePicker
                  value={task.startDate}
                  onChange={(startDate) => updateTask(task.id, { startDate })}
                  placeholder="Set start date"
                />
              </PropertyRow>

              <PropertyRow icon="mingcute:calendar-2-line" label="Due date">
                <DatePicker value={task.dueDate} onChange={(dueDate) => updateTask(task.id, { dueDate })}>
                  <button
                    className={cn(pickerTriggerCls, dueStateColor[dueState(task.dueDate, !!task.completedAt)])}
                  >
                    <Icon name="mingcute:calendar-2-line" size={14} />
                    {task.dueDate ? formatDate(task.dueDate) : "Set due date"}
                  </button>
                </DatePicker>
              </PropertyRow>

              <PropertyRow icon="mingcute:sandglass-line" label="Estimate">
                <InlineNumberInput
                  value={task.estimateHours}
                  onCommit={(estimateHours) => updateTask(task.id, { estimateHours })}
                  suffix="h"
                  min={0}
                />
              </PropertyRow>

              <PropertyRow icon="mingcute:hashtag-line" label="Story points">
                <InlineNumberInput
                  value={task.storyPoints}
                  onCommit={(storyPoints) => updateTask(task.id, { storyPoints })}
                  min={0}
                />
              </PropertyRow>

              <PropertyRow icon="mingcute:time-line" label="Created">
                <span className="block truncate px-2 py-1 text-xs text-white/55">
                  {formatDateTime(task.createdAt)} · <UserName userId={task.createdBy} />
                </span>
              </PropertyRow>

              <PropertyRow icon="mingcute:tag-line" label="Tags" full>
                <TagPicker
                  value={task.tagIds}
                  onChange={(tagIds) => updateTask(task.id, { tagIds })}
                  triggerClassName="max-w-full"
                >
                  <button className={cn(pickerTriggerCls, "flex-wrap gap-y-1")}>
                    {task.tagIds.length ? (
                      <TagChips tagIds={task.tagIds} tags={tags} max={8} />
                    ) : (
                      <span className="flex items-center gap-1.5 text-white/40">
                        <Icon name="mingcute:tag-line" size={13} />
                        Add tags
                      </span>
                    )}
                  </button>
                </TagPicker>
              </PropertyRow>

              {project?.customFields.map((field) => (
                <PropertyRow key={field.id} icon={field.icon} label={field.name}>
                  <CustomFieldControl field={field} task={task} />
                </PropertyRow>
              ))}
            </div>
          </div>

          <DescriptionSection key={`desc-${task.id}`} task={task} />
          <ChecklistSection key={`check-${task.id}`} task={task} />
          <SubtasksSection key={`sub-${task.id}`} task={task} />
          <AttachmentsSection task={task} />

          {/* ── tabs ── */}
          <div className="border-t border-white/8">
            <div className="flex items-center gap-1 border-b border-white/8 px-5">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative flex cursor-pointer items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                    tab === t.id ? "text-white" : "text-white/45 hover:text-white/75"
                  )}
                >
                  <Icon name={t.icon} size={14} />
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] tabular-nums text-white/55">
                      {t.count}
                    </span>
                  )}
                  {tab === t.id && (
                    <motion.span
                      layoutId="taskpanel-tab-underline"
                      className="accent-gradient absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                      transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="min-h-[240px] px-5 py-4">
              {tab === "comments" && <CommentsSection taskId={task.id} />}
              {tab === "activity" && <ActivityFeed taskId={task.id} />}
              {tab === "time" && <TimeTab task={task} />}
            </div>
          </div>
        </div>

        {/* ── pinned composer ── */}
        {tab === "comments" && (
          <div className="shrink-0 border-t border-white/8 px-4 py-3">
            <CommentComposer key={`composer-${task.id}`} taskId={task.id} />
          </div>
        )}

        {/* ── footer micro-info ── */}
        <footer className="flex shrink-0 items-center gap-1.5 border-t border-white/8 px-5 py-1.5 text-[10px] text-white/35">
          <span>Created {timeAgo(task.createdAt)}</span>
          <span className="text-white/15">·</span>
          <span>Updated {timeAgo(task.updatedAt)}</span>
          <span className="flex-1" />
          {watchers.length > 0 && (
            <span className="flex items-center gap-1.5" title={`${watchers.length} watching`}>
              <Icon name="mingcute:eye-2-line" size={12} />
              <AvatarStack users={watchers} size={16} max={5} />
            </span>
          )}
        </footer>
      </motion.aside>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteTask(task.id);
          closeTask();
          toast("Task deleted", { icon: "mingcute:delete-2-line", kind: "info" });
        }}
        title="Delete this task?"
        body="The task, its subtasks, comments and time entries will be permanently removed."
      />
    </>
  );
}

export function TaskPanel() {
  const selectedTaskId = useUI((s) => s.selectedTaskId);
  const task = useStore((s) => (selectedTaskId ? s.tasks.find((t) => t.id === selectedTaskId) : undefined));
  return <AnimatePresence>{task ? <TaskPanelInner key="task-panel" task={task} /> : null}</AnimatePresence>;
}
