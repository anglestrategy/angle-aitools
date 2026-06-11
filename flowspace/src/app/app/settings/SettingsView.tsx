"use client";

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Role, User } from "@/lib/types";
import { cn, colorPalette, formatDate } from "@/lib/utils";
import { Avatar, Badge, Button, Divider, Icon, IconButton, Input, SectionLabel, Toggle } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuLabel, MenuList, Modal, ModalHeader, Popover } from "@/components/ui/overlay";

export type SettingsTab = "general" | "members" | "tags" | "import" | "danger" | "profile";

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "mingcute:settings-3-line" },
  { id: "members", label: "Members", icon: "mingcute:group-2-line" },
  { id: "tags", label: "Tags", icon: "mingcute:tag-line" },
  { id: "import", label: "Import / Export", icon: "mingcute:file-export-line" },
  { id: "profile", label: "Profile", icon: "mingcute:user-3-line" },
  { id: "danger", label: "Danger zone", icon: "mingcute:alert-line" },
];

const roles: Role[] = ["owner", "admin", "member", "guest"];
const roleColors: Record<Role, string> = { owner: "#fbbf24", admin: "#a78bfa", member: "#38bdf8", guest: "#94a3b8" };

// ─── General ─────────────────────────────────────────────────────────────────

const plans = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    features: ["Up to 5 members", "3 spaces", "100 MB storage", "Basic views"],
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$12",
    features: ["Unlimited members", "Unlimited spaces", "Automations & goals", "Time tracking", "Priority support"],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "SSO & SCIM", "Audit log", "Dedicated success manager", "99.9% SLA"],
  },
];

function GeneralTab() {
  const toast = useUI((s) => s.toast);
  const workspace = useStore((s) => s.workspace);
  const updateWorkspace = useStore((s) => s.updateWorkspace);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <SectionLabel>Workspace</SectionLabel>
        <div className="mt-3 flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${workspace.color}, ${workspace.color}88)`, boxShadow: `0 6px 24px ${workspace.color}50` }}
          >
            {workspace.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-white/45">Workspace name</label>
            <Input
              key={workspace.name}
              defaultValue={workspace.name}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== workspace.name) {
                  updateWorkspace({ name: next });
                  toast("Workspace renamed", { body: next, icon: "mingcute:edit-2-line" });
                } else e.target.value = workspace.name;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="max-w-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-[11px] font-medium text-white/45">Accent color</label>
          <div className="flex flex-wrap gap-1.5">
            {colorPalette.map((c) => (
              <button
                key={c}
                onClick={() => updateWorkspace({ color: c })}
                className={cn("h-7 w-7 rounded-full cursor-pointer transition-transform", c === workspace.color && "scale-110 ring-2 ring-white/70")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 text-[11px] text-white/30">Created {formatDate(workspace.createdAt.slice(0, 10))}</p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <SectionLabel>Plan & billing</SectionLabel>
          <Badge color="#818cf8" size="sm">
            Current: {workspace.plan}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {plans.map((p) => {
            const current = workspace.plan === p.id;
            return (
              <div key={p.id} className={cn("glass-card flex flex-col p-4", current && "border-indigo-400/40 bg-indigo-500/8")}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/90">{p.name}</h3>
                  <span className="text-sm font-bold text-white/80">
                    {p.price}
                    {p.id !== "enterprise" && <span className="text-[10px] font-normal text-white/35">/user/mo</span>}
                  </span>
                </div>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/55">
                      <Icon name="mingcute:check-line" size={12} className="mt-px shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={current ? "subtle" : "primary"}
                  className="mt-4 w-full"
                  disabled={current}
                  onClick={() => toast("This is a demo workspace", { body: "Plan changes are disabled here.", icon: "mingcute:information-line", kind: "info" })}
                >
                  {current ? "Current plan" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Members ─────────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const toast = useUI((s) => s.toast);
  const inviteUser = useStore((s) => s.inviteUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<Role>("member");

  const submit = () => {
    if (!name.trim() || !email.trim()) return;
    inviteUser(name.trim(), email.trim(), role, title.trim() || "Team member");
    toast("Invitation sent", { body: `${name.trim()} was added to the workspace`, icon: "mingcute:mail-line" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={460}>
      <ModalHeader title="Invite member" icon="mingcute:user-add-line" onClose={onClose} />
      <div className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-white/45">Full name</label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-white/45">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@company.com" className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-white/45">Job title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product Engineer" className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-white/45">Role</label>
          <div className="flex gap-1.5">
            {(["admin", "member", "guest"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "h-8 flex-1 rounded-lg border text-xs font-medium capitalize transition-colors cursor-pointer",
                  role === r ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-100" : "border-white/10 text-white/55 hover:bg-white/6"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon="mingcute:mail-line" onClick={submit} disabled={!name.trim() || !email.trim()}>
            Send invite
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MemberRow({ user }: { user: User }) {
  const toast = useUI((s) => s.toast);
  const currentUserId = useStore((s) => s.currentUserId);
  const updateUser = useStore((s) => s.updateUser);
  const removeUser = useStore((s) => s.removeUser);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isSelf = user.id === currentUserId;
  const protectedUser = isSelf || user.role === "owner";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_110px_90px_70px_40px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_90px_70px_40px]">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar user={user} size={32} showOnline />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-white/90">{user.name}</span>
            {isSelf && (
              <Badge color="#818cf8" size="sm">
                You
              </Badge>
            )}
          </div>
          <span className="block truncate text-[11px] text-white/40">{user.email}</span>
        </div>
      </div>
      <span className="hidden truncate text-xs text-white/50 md:block">{user.title}</span>
      <Popover
        width={170}
        trigger={
          <button className="cursor-pointer">
            <Badge color={roleColors[user.role]}>
              <span className="capitalize">{user.role}</span>
              <Icon name="mingcute:down-line" size={10} />
            </Badge>
          </button>
        }
      >
        <MenuList>
          <MenuLabel>Role</MenuLabel>
          {roles.map((r) => (
            <MenuItem
              key={r}
              icon="mingcute:shield-line"
              color={roleColors[r]}
              label={<span className="capitalize">{r}</span>}
              active={r === user.role}
              onClick={() => updateUser(user.id, { role: r })}
            />
          ))}
        </MenuList>
      </Popover>
      <span className="flex items-center gap-1 text-xs text-white/55">
        <input
          key={`${user.id}-${user.capacityHours}`}
          type="number"
          min={0}
          defaultValue={user.capacityHours}
          onBlur={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n) && n !== user.capacityHours) updateUser(user.id, { capacityHours: n });
          }}
          className="input-glass h-7 w-12 px-1.5 text-center text-xs"
        />
        h/wk
      </span>
      <span className="flex items-center gap-1.5 text-[11px]">
        <span className={cn("h-2 w-2 rounded-full", user.online ? "bg-emerald-400 animate-pulse-dot" : "bg-white/20")} />
        <span className={user.online ? "text-emerald-300" : "text-white/35"}>{user.online ? "Online" : "Away"}</span>
      </span>
      <span>
        {!protectedUser && (
          <IconButton
            size="sm"
            icon="mingcute:user-remove-line"
            label="Remove member"
            className="hover:bg-rose-500/15 hover:text-rose-300"
            onClick={() => setConfirmRemove(true)}
          />
        )}
      </span>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove ${user.name}?`}
        body="They will lose access to the workspace and be unassigned from all tasks."
        confirmLabel="Remove"
        onConfirm={() => {
          removeUser(user.id);
          toast("Member removed", { body: user.name, icon: "mingcute:user-remove-line", kind: "info" });
        }}
      />
    </div>
  );
}

function MembersTab() {
  const users = useStore((s) => s.users);
  const [inviteOpen, setInviteOpen] = useState(false);
  const online = users.filter((u) => u.online).length;

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div>
          <SectionLabel>Members</SectionLabel>
          <p className="mt-0.5 text-[11px] text-white/40">
            {users.length} members · {online} online now
          </p>
        </div>
        <span className="flex-1" />
        <Button variant="primary" size="sm" icon="mingcute:user-add-line" onClick={() => setInviteOpen(true)}>
          Invite member
        </Button>
      </div>
      <Divider className="mb-2" />
      <div className="space-y-0.5">
        {users.map((u) => (
          <MemberRow key={u.id} user={u} />
        ))}
      </div>
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

// ─── Tags ────────────────────────────────────────────────────────────────────

function TagsTab() {
  const toast = useUI((s) => s.toast);
  const tags = useStore((s) => s.tags);
  const tasks = useStore((s) => s.tasks);
  const createTag = useStore((s) => s.createTag);
  const deleteTag = useStore((s) => s.deleteTag);

  const [name, setName] = useState("");
  const [color, setColor] = useState(colorPalette[0]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const confirmTag = tags.find((t) => t.id === confirmId) ?? null;
  const usage = (id: string) => tasks.filter((t) => t.tagIds.includes(id)).length;

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    if (tags.some((t) => t.name.toLowerCase() === n.toLowerCase())) {
      toast("Tag already exists", { body: n, icon: "mingcute:tag-line", kind: "error" });
      return;
    }
    createTag(n, color);
    toast("Tag created", { body: n, icon: "mingcute:tag-line" });
    setName("");
  };

  return (
    <div className="glass-card p-5">
      <SectionLabel>Workspace tags</SectionLabel>
      <p className="mt-0.5 text-[11px] text-white/40">Tags are shared across every project.</p>

      {/* create */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Popover
          width={200}
          trigger={
            <button className="input-glass flex h-9 w-9 items-center justify-center cursor-pointer" title="Tag color">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
            </button>
          }
        >
          {(close) => (
            <div className="flex flex-wrap gap-1.5 p-3">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    close();
                  }}
                  className={cn("h-6 w-6 rounded-full cursor-pointer transition-transform", c === color && "scale-110 ring-2 ring-white/70")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </Popover>
        <Input
          placeholder="New tag name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-56"
        />
        <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={submit} disabled={!name.trim()}>
          Create tag
        </Button>
      </div>

      <Divider className="my-4" />

      <div className="space-y-0.5">
        {tags.map((t) => (
          <div key={t.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/4">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}70` }} />
            <Badge color={t.color}>{t.name}</Badge>
            <span className="text-[11px] text-white/35">
              {usage(t.id)} task{usage(t.id) === 1 ? "" : "s"}
            </span>
            <span className="flex-1" />
            <IconButton
              size="sm"
              icon="mingcute:delete-2-line"
              label="Delete tag"
              className="opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-300"
              onClick={() => setConfirmId(t.id)}
            />
          </div>
        ))}
        {!tags.length && <p className="px-3 py-6 text-center text-xs text-white/35">No tags yet — create one above.</p>}
      </div>

      <ConfirmDialog
        open={!!confirmTag}
        onClose={() => setConfirmId(null)}
        title={`Delete tag “${confirmTag?.name}”?`}
        body={`It will be removed from ${confirmTag ? usage(confirmTag.id) : 0} task(s). This cannot be undone.`}
        onConfirm={() => {
          if (confirmTag) {
            deleteTag(confirmTag.id);
            toast("Tag deleted", { body: confirmTag.name, icon: "mingcute:delete-2-line", kind: "info" });
          }
        }}
      />
    </div>
  );
}

// ─── Import / Export ─────────────────────────────────────────────────────────

function ImportExportTab() {
  const toast = useUI((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const s = useStore.getState();
    const data = {
      exportedAt: new Date().toISOString(),
      workspace: s.workspace,
      users: s.users,
      spaces: s.spaces,
      projects: s.projects,
      tasks: s.tasks,
      tags: s.tags,
      docs: s.docs,
      goals: s.goals,
      automations: s.automations,
      integrations: s.integrations,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowspace-${s.workspace.name.toLowerCase().replace(/\s+/g, "-")}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export ready", { body: "Your workspace JSON is downloading.", icon: "mingcute:download-2-line" });
  };

  const onImportFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        JSON.parse(String(reader.result));
        toast("Import is demo-only", { body: `Parsed “${file.name}” successfully, but importing is disabled in the demo.`, icon: "mingcute:information-line", kind: "info" });
      } catch {
        toast("Invalid JSON file", { body: file.name, icon: "mingcute:alert-line", kind: "error" });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const connectors = [
    { label: "CSV", icon: "mingcute:table-2-line", color: "#34d399" },
    { label: "Asana", icon: "mingcute:checkbox-line", color: "#f97316" },
    { label: "Trello", icon: "mingcute:layout-grid-line", color: "#38bdf8" },
    { label: "Jira", icon: "mingcute:git-branch-line", color: "#3b82f6" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="glass-card p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Icon name="mingcute:download-2-line" size={19} />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-white/90">Export workspace</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Download everything — spaces, projects, tasks, docs, goals and automations — as a single JSON file.
          </p>
          <Button variant="primary" size="sm" icon="mingcute:download-2-line" className="mt-4" onClick={exportJson}>
            Export JSON
          </Button>
        </div>
        <div className="glass-card p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <Icon name="mingcute:upload-2-line" size={19} />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-white/90">Import data</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Bring work from another tool or restore a previous export. Import is read-only in this demo.
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImportFile(e.target.files?.[0])} />
          <Button variant="subtle" size="sm" icon="mingcute:upload-2-line" className="mt-4" onClick={() => fileRef.current?.click()}>
            Choose JSON file
          </Button>
        </div>
      </div>

      <div className="glass-card p-5">
        <SectionLabel>Import from other tools</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {connectors.map((c) => (
            <button
              key={c.label}
              onClick={() => toast("Coming soon", { body: `${c.label} import is on the roadmap.`, icon: c.icon, kind: "info" })}
              className="glass-soft glass-hover flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.color}1c`, color: c.color }}>
                <Icon name={c.icon} size={16} />
              </span>
              <span className="text-xs font-medium text-white/80">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function ProfileTab() {
  const toast = useUI((s) => s.toast);
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const updateUser = useStore((s) => s.updateUser);

  if (!me) return null;

  return (
    <div className="glass-card max-w-2xl p-5">
      <SectionLabel>Your profile</SectionLabel>
      <div className="mt-4 flex items-start gap-4">
        <Avatar user={me} size={56} showOnline />
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-white/45">Full name</label>
              <Input
                key={`name-${me.name}`}
                defaultValue={me.name}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== me.name) {
                    updateUser(me.id, {
                      name: next,
                      initials: next
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase(),
                    });
                    toast("Profile updated", { icon: "mingcute:check-circle-fill" });
                  } else e.target.value = me.name;
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-white/45">Job title</label>
              <Input
                key={`title-${me.title}`}
                defaultValue={me.title}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== me.title) {
                    updateUser(me.id, { title: next });
                    toast("Profile updated", { icon: "mingcute:check-circle-fill" });
                  } else e.target.value = me.title;
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-white/45">Email</label>
              <Input value={me.email} readOnly disabled className="w-full opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-white/45">Weekly capacity (hours)</label>
              <Input
                key={`cap-${me.capacityHours}`}
                type="number"
                min={0}
                defaultValue={me.capacityHours}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n) && n !== me.capacityHours) updateUser(me.id, { capacityHours: n });
                }}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium text-white/45">Avatar color</label>
            <div className="flex flex-wrap gap-1.5">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  onClick={() => updateUser(me.id, { color: c })}
                  className={cn("h-7 w-7 rounded-full cursor-pointer transition-transform", c === me.color && "scale-110 ring-2 ring-white/70")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3.5 py-2.5">
            <span>
              <span className="block text-xs font-medium text-white/85">Show as online</span>
              <span className="block text-[10px] text-white/40">Teammates see a green dot on your avatar</span>
            </span>
            <Toggle on={me.online} onChange={(v) => updateUser(me.id, { online: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Danger zone ─────────────────────────────────────────────────────────────

function DangerTab() {
  const toast = useUI((s) => s.toast);
  const resetDemoData = useStore((s) => s.resetDemoData);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-amber-400/25 bg-amber-500/6 p-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-200">
            <Icon name="mingcute:refresh-2-line" size={15} />
            Reset demo data
          </h3>
          <p className="mt-1 text-xs text-white/45">Restore the workspace to its original seeded state. Your changes will be lost.</p>
        </div>
        <Button variant="subtle" size="sm" icon="mingcute:refresh-2-line" onClick={() => setConfirmReset(true)}>
          Reset
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-rose-400/25 bg-rose-500/6 p-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-rose-300">
            <Icon name="mingcute:delete-2-line" size={15} />
            Delete workspace
          </h3>
          <p className="mt-1 text-xs text-white/45">Permanently delete this workspace and everything inside it.</p>
        </div>
        <Button variant="danger" size="sm" icon="mingcute:delete-2-line" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        body="All your edits will be discarded and the original demo content restored."
        confirmLabel="Reset data"
        danger={false}
        onConfirm={() => {
          resetDemoData();
          toast("Demo data reset", { body: "Everything is back to its original state.", icon: "mingcute:refresh-2-line" });
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this workspace?"
        body="This would permanently delete the workspace, its projects, tasks and docs."
        confirmLabel="Delete workspace"
        onConfirm={() => toast("This is a demo workspace", { body: "Deletion is disabled here — feel free to keep exploring.", icon: "mingcute:information-line", kind: "info" })}
      />
    </div>
  );
}

// ─── View ────────────────────────────────────────────────────────────────────

export function SettingsView({ initialTab = "general" }: { initialTab?: SettingsTab }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="border-b border-white/8 px-5 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_16px_rgba(99,102,241,0.4)]">
            <Icon name="mingcute:settings-3-line" size={18} className="text-white" />
          </span>
          <div>
            <h1 className="text-[15px] font-semibold text-white/95">Settings</h1>
            <p className="text-[11px] text-white/40">Workspace, members and personal preferences</p>
          </div>
        </div>
        {/* tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
                tab === t.id ? "text-white" : "text-white/45 hover:text-white/80",
                t.id === "danger" && tab !== "danger" && "text-rose-300/60 hover:text-rose-300"
              )}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="settings-tab-indicator"
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full accent-gradient"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
          >
            {tab === "general" && <GeneralTab />}
            {tab === "members" && <MembersTab />}
            {tab === "tags" && <TagsTab />}
            {tab === "import" && <ImportExportTab />}
            {tab === "profile" && <ProfileTab />}
            {tab === "danger" && <DangerTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
