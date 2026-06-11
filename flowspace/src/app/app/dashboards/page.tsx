"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Dashboard } from "@/lib/types";
import { cn, pluralize, timeAgo } from "@/lib/utils";
import { Avatar, Button, Icon, Input } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuList, MenuSeparator, Modal, ModalHeader, Popover } from "@/components/ui/overlay";

const iconOptions = [
  "mingcute:chart-pie-line",
  "mingcute:chart-bar-line",
  "mingcute:dashboard-2-line",
  "mingcute:heartbeat-2-line",
  "mingcute:target-line",
  "mingcute:rocket-line",
];

function DashboardCard({ dashboard, index }: { dashboard: Dashboard; index: number }) {
  const router = useRouter();
  const users = useStore((s) => s.users);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const updateDashboard = useStore((s) => s.updateDashboard);
  const deleteDashboard = useStore((s) => s.deleteDashboard);
  const toast = useUI((s) => s.toast);

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(dashboard.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const creator = users.find((u) => u.id === dashboard.createdBy);
  const isFav = favorites.dashboards.includes(dashboard.id);

  const commitRename = () => {
    const name = draft.trim();
    if (name && name !== dashboard.name) {
      updateDashboard(dashboard.id, { name });
      toast("Dashboard renamed", { kind: "info", icon: "mingcute:edit-2-line" });
    }
    setRenaming(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.05 }}
    >
      <div
        onClick={() => {
          if (!renaming) router.push(`/app/dashboards/${dashboard.id}`);
        }}
        className="glass-card glass-hover sheen group relative cursor-pointer p-4"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/18 shadow-[0_4px_14px_rgba(99,102,241,0.25)]">
            <Icon name={dashboard.icon} size={19} className="text-indigo-300" />
          </span>
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setDraft(dashboard.name);
                    setRenaming(false);
                  }
                }}
                className="input-glass h-7 w-full px-2 text-[13px] font-semibold"
              />
            ) : (
              <div className="truncate text-[13px] font-semibold text-white/92">{dashboard.name}</div>
            )}
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/40">
              <Icon name="mingcute:layout-grid-line" size={11} />
              {pluralize(dashboard.widgets.length, "widget")}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite("dashboards", dashboard.id);
            }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer",
              isFav ? "text-amber-300" : "text-white/25 opacity-0 group-hover:opacity-100 hover:text-amber-300"
            )}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Icon name={isFav ? "mingcute:star-fill" : "mingcute:star-line"} size={15} />
          </button>

          <span onClick={(e) => e.stopPropagation()}>
            <Popover
              width={180}
              align="end"
              trigger={
                <button className="flex h-6 w-6 items-center justify-center rounded-md text-white/35 opacity-0 transition-colors cursor-pointer group-hover:opacity-100 hover:bg-white/10 hover:text-white">
                  <Icon name="mingcute:more-2-line" size={15} />
                </button>
              }
            >
              <MenuList>
                <MenuItem
                  icon="mingcute:edit-2-line"
                  label="Rename"
                  onClick={() => {
                    setDraft(dashboard.name);
                    setRenaming(true);
                  }}
                />
                <MenuItem
                  icon="mingcute:star-line"
                  label={isFav ? "Remove favorite" : "Add to favorites"}
                  onClick={() => toggleFavorite("dashboards", dashboard.id)}
                />
                <MenuSeparator />
                <MenuItem icon="mingcute:delete-2-line" label="Delete" danger onClick={() => setConfirmDelete(true)} />
              </MenuList>
            </Popover>
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
          <div className="flex items-center gap-2">
            {creator && <Avatar user={creator} size={20} />}
            <span className="text-[10px] text-white/35">
              {creator?.name.split(" ")[0] ?? "Someone"} · created {timeAgo(dashboard.createdAt)}
            </span>
          </div>
          <Icon
            name="mingcute:arrow-right-line"
            size={15}
            className="text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteDashboard(dashboard.id);
          toast("Dashboard deleted", { kind: "info", icon: "mingcute:delete-2-line" });
        }}
        title={`Delete “${dashboard.name}”?`}
        body="All widgets on this dashboard will be removed. This cannot be undone."
      />
    </motion.div>
  );
}

export default function DashboardsPage() {
  const router = useRouter();
  const dashboards = useStore((s) => s.dashboards);
  const createDashboard = useStore((s) => s.createDashboard);
  const toast = useUI((s) => s.toast);

  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(iconOptions[0]);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createDashboard(trimmed, icon);
    toast("Dashboard created", { icon: "mingcute:dashboard-2-line" });
    setNewOpen(false);
    setName("");
    setIcon(iconOptions[0]);
    router.push(`/app/dashboards/${id}`);
  };

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_14px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:dashboard-2-line" size={17} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight">Dashboards</h1>
          <p className="text-[11px] text-white/40">Live reporting across the whole workspace</p>
        </div>
        <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => setNewOpen(true)}>
          New dashboard
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {dashboards.map((d, i) => (
            <DashboardCard key={d.id} dashboard={d} index={i} />
          ))}

          {/* new dashboard card */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, delay: dashboards.length * 0.05 }}
            onClick={() => setNewOpen(true)}
            className="flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/15 text-white/40 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/6 hover:text-indigo-200"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/6">
              <Icon name="mingcute:add-line" size={20} />
            </span>
            <span className="text-xs font-medium">New dashboard</span>
          </motion.button>
        </div>
      </div>

      {/* create modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} width={440}>
        <ModalHeader title="New dashboard" icon="mingcute:dashboard-2-line" onClose={() => setNewOpen(false)} />
        <div className="p-5">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Name</label>
          <Input
            autoFocus
            placeholder="e.g. Engineering health"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
            className="w-full"
          />
          <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Icon</label>
          <div className="flex gap-2">
            {iconOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setIcon(opt)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer",
                  icon === opt
                    ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-200 shadow-[0_0_14px_rgba(99,102,241,0.35)]"
                    : "border-white/10 bg-white/4 text-white/50 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon name={opt} size={18} />
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={create} disabled={!name.trim()}>
              Create dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
