"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Goal, GoalStatus, ID, KeyResult } from "@/lib/types";
import { clamp, cn, colorPalette, formatDate } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Icon, IconButton, Input, ProgressBar, Textarea, Toggle } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuLabel, MenuList, Modal, ModalHeader, Popover } from "@/components/ui/overlay";
import { AssigneePicker, DatePicker } from "@/components/fields/pickers";

// ─── Meta ────────────────────────────────────────────────────────────────────

const goalStatusMeta: Record<GoalStatus, { label: string; color: string; icon: string }> = {
  on_track: { label: "On track", color: "#34d399", icon: "mingcute:trending-up-line" },
  at_risk: { label: "At risk", color: "#fbbf24", icon: "mingcute:alert-line" },
  off_track: { label: "Off track", color: "#fb7185", icon: "mingcute:trending-down-line" },
  completed: { label: "Completed", color: "#818cf8", icon: "mingcute:check-circle-line" },
};

const krTypes: { value: KeyResult["type"]; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Yes / No" },
];

function krProgress(kr: KeyResult): number {
  if (kr.target === 0) return kr.current === 0 ? 100 : 0;
  return clamp((kr.current / kr.target) * 100, 0, 100);
}

function goalProgress(goal: Goal): number {
  if (!goal.keyResults.length) return 0;
  return Math.round(goal.keyResults.reduce((sum, kr) => sum + krProgress(kr), 0) / goal.keyResults.length);
}

function krValue(kr: KeyResult, v: number): string {
  if (kr.type === "percent") return `${v}%`;
  if (kr.type === "currency") return `$${v}${kr.unit}`;
  return `${v}${kr.unit}`;
}

// ─── Key result row ──────────────────────────────────────────────────────────

function KeyResultRow({ goal, kr }: { goal: Goal; kr: KeyResult }) {
  const updateKeyResult = useStore((s) => s.updateKeyResult);
  const deleteKeyResult = useStore((s) => s.deleteKeyResult);

  const commit = (el: HTMLInputElement) => {
    const n = parseFloat(el.value);
    if (!Number.isNaN(n) && n !== kr.current) updateKeyResult(goal.id, kr.id, { current: n });
    else el.value = String(kr.current);
  };

  const pct = krProgress(kr);

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/4">
      <Icon name="mingcute:target-line" size={14} className="shrink-0 text-white/30" />
      <span className="min-w-0 flex-1 truncate text-xs text-white/80">{kr.name}</span>
      <ProgressBar value={pct} color={goal.color} className="hidden w-24 shrink-0 sm:block" height={5} />
      {kr.type === "boolean" ? (
        <span className="flex shrink-0 items-center gap-2">
          <span className={cn("text-[11px] font-medium", kr.current >= kr.target ? "text-emerald-300" : "text-white/40")}>
            {kr.current >= kr.target ? "Done" : "Not done"}
          </span>
          <Toggle size="sm" on={kr.current >= kr.target} onChange={(v) => updateKeyResult(goal.id, kr.id, { current: v ? kr.target || 1 : 0 })} />
        </span>
      ) : (
        <span className="flex shrink-0 items-baseline gap-1 text-[11px] text-white/55">
          <input
            key={kr.current}
            type="number"
            defaultValue={kr.current}
            onBlur={(e) => commit(e.target)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="input-glass h-6 w-14 px-1.5 text-right text-[11px]"
          />
          <span className="whitespace-nowrap text-white/40">/ {krValue(kr, kr.target)}</span>
        </span>
      )}
      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-white/40">{Math.round(pct)}%</span>
      <IconButton
        size="xs"
        icon="mingcute:delete-2-line"
        label="Delete key result"
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-300"
        onClick={() => deleteKeyResult(goal.id, kr.id)}
      />
    </div>
  );
}

// ─── Add key result form ─────────────────────────────────────────────────────

function AddKeyResult({ goalId }: { goalId: ID }) {
  const addKeyResult = useStore((s) => s.addKeyResult);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<KeyResult["type"]>("number");
  const [target, setTarget] = useState("100");
  const [unit, setUnit] = useState("");

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/12 cursor-pointer"
      >
        <Icon name="mingcute:add-line" size={14} />
        Add key result
      </button>
    );

  const submit = () => {
    if (!name.trim()) return;
    const t = type === "boolean" ? 1 : parseFloat(target) || 0;
    addKeyResult(goalId, { name: name.trim(), type, current: 0, target: t, unit: type === "percent" ? "%" : unit.trim() });
    setName("");
    setTarget("100");
    setUnit("");
    setOpen(false);
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/3 p-2">
      <Input
        autoFocus
        inputSize="sm"
        placeholder="Key result name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="min-w-[160px] flex-1"
      />
      <Popover
        width={150}
        trigger={
          <button className="input-glass flex h-8 items-center gap-1.5 px-2.5 text-xs text-white/80 cursor-pointer">
            {krTypes.find((t) => t.value === type)?.label}
            <Icon name="mingcute:down-line" size={12} className="text-white/40" />
          </button>
        }
      >
        <MenuList>
          {krTypes.map((t) => (
            <MenuItem key={t.value} label={t.label} active={t.value === type} onClick={() => setType(t.value)} />
          ))}
        </MenuList>
      </Popover>
      {type !== "boolean" && (
        <>
          <span className="flex items-center gap-1 text-[11px] text-white/40">
            Target
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="input-glass h-8 w-16 px-2 text-right text-xs"
            />
          </span>
          {type !== "percent" && (
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="unit"
              className="input-glass h-8 w-14 px-2 text-xs"
            />
          )}
        </>
      )}
      <Button size="sm" variant="primary" onClick={submit} disabled={!name.trim()}>
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

// ─── Goal card ───────────────────────────────────────────────────────────────

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const toast = useUI((s) => s.toast);
  const users = useStore((s) => s.users);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const [expanded, setExpanded] = useState(index === 0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const owner = users.find((u) => u.id === goal.ownerId);
  const status = goalStatusMeta[goal.status];
  const pct = goalProgress(goal);

  const commitName = (el: HTMLInputElement) => {
    const next = el.value.trim();
    if (next && next !== goal.name) updateGoal(goal.id, { name: next });
    else el.value = goal.name;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.06, 0.4) }}
      className="glass-card overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${goal.color}, ${goal.color}55)` }} />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* status picker */}
          <Popover
            width={180}
            trigger={
              <button className="cursor-pointer">
                <Badge color={status.color}>
                  <Icon name={status.icon} size={11} />
                  {status.label}
                </Badge>
              </button>
            }
          >
            <MenuList>
              <MenuLabel>Goal status</MenuLabel>
              {(Object.keys(goalStatusMeta) as GoalStatus[]).map((st) => (
                <MenuItem
                  key={st}
                  icon={goalStatusMeta[st].icon}
                  color={goalStatusMeta[st].color}
                  label={goalStatusMeta[st].label}
                  active={st === goal.status}
                  onClick={() => updateGoal(goal.id, { status: st })}
                />
              ))}
            </MenuList>
          </Popover>

          <input
            key={goal.name}
            defaultValue={goal.name}
            onBlur={(e) => commitName(e.target)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="min-w-[160px] flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-white/25"
          />

          <DatePicker value={goal.dueDate} onChange={(d) => updateGoal(goal.id, { dueDate: d })}>
            <button className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors cursor-pointer hover:bg-white/8", goal.dueDate ? "text-white/70" : "text-white/35")}>
              <Icon name="mingcute:calendar-line" size={13} />
              {goal.dueDate ? formatDate(goal.dueDate) : "Due date"}
            </button>
          </DatePicker>

          <AssigneePicker
            value={owner ? [owner.id] : []}
            onChange={(ids) => {
              const next = ids.find((id) => id !== goal.ownerId) ?? ids[0];
              if (next) updateGoal(goal.id, { ownerId: next });
            }}
          >
            <button className="cursor-pointer" title={owner ? `Owner: ${owner.name}` : "Set owner"}>
              {owner ? (
                <Avatar user={owner} size={26} />
              ) : (
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-white/25 text-white/40">
                  <Icon name="mingcute:user-add-line" size={13} />
                </span>
              )}
            </button>
          </AssigneePicker>

          <Popover
            width={170}
            align="end"
            trigger={<IconButton size="sm" icon="mingcute:more-1-line" label="Goal actions" />}
          >
            <MenuList>
              <MenuItem icon="mingcute:delete-2-line" label="Delete goal" danger onClick={() => setConfirmDelete(true)} />
            </MenuList>
          </Popover>
        </div>

        {goal.description && <p className="mt-1.5 text-xs leading-relaxed text-white/45">{goal.description}</p>}

        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={pct} color={goal.color} className="flex-1" />
          <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: goal.color }}>
            {pct}%
          </span>
        </div>

        {/* key results */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/50 transition-colors hover:text-white cursor-pointer"
        >
          <Icon name={expanded ? "mingcute:down-line" : "mingcute:right-line"} size={13} />
          {goal.keyResults.length} key result{goal.keyResults.length === 1 ? "" : "s"}
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-0.5 border-t border-white/6 pt-2">
                {goal.keyResults.map((kr) => (
                  <KeyResultRow key={kr.id} goal={goal} kr={kr} />
                ))}
                {!goal.keyResults.length && (
                  <p className="px-2 py-1 text-[11px] text-white/30">No key results yet — add one to start measuring.</p>
                )}
                <AddKeyResult goalId={goal.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${goal.name}”?`}
        body="The goal and all of its key results will be removed permanently."
        onConfirm={() => {
          deleteGoal(goal.id);
          toast("Goal deleted", { body: goal.name, icon: "mingcute:delete-2-line", kind: "info" });
        }}
      />
    </motion.div>
  );
}

// ─── New goal modal ──────────────────────────────────────────────────────────

function NewGoalModal({ onClose }: { onClose: () => void }) {
  const toast = useUI((s) => s.toast);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const createGoal = useStore((s) => s.createGoal);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<ID | null>(currentUserId);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [color, setColor] = useState(() => colorPalette[Math.floor(Math.random() * colorPalette.length)]);

  const owner = users.find((u) => u.id === ownerId);

  const submit = () => {
    if (!name.trim() || !ownerId) return;
    createGoal({ name: name.trim(), description: description.trim(), ownerId, dueDate, color });
    toast("Goal created", { body: name.trim(), icon: "mingcute:target-line" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={520}>
      <ModalHeader title="New goal" icon="mingcute:target-line" onClose={onClose} />
      <div className="space-y-4 p-5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Goal name — e.g. Lift retention to 50%"
          className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/25 outline-none"
        />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why does this goal matter?" rows={2} />
        <div className="flex flex-wrap items-center gap-2">
          <AssigneePicker
            value={ownerId ? [ownerId] : []}
            onChange={(ids) => setOwnerId(ids.find((id) => id !== ownerId) ?? ids[0] ?? null)}
          >
            <button className="glass-soft glass-hover flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-white/75 cursor-pointer">
              {owner ? (
                <>
                  <Avatar user={owner} size={18} />
                  {owner.name}
                </>
              ) : (
                <>
                  <Icon name="mingcute:user-add-line" size={13} />
                  Owner
                </>
              )}
            </button>
          </AssigneePicker>
          <DatePicker value={dueDate} onChange={setDueDate}>
            <button className={cn("glass-soft glass-hover flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs cursor-pointer", dueDate ? "text-white/85" : "text-white/45")}>
              <Icon name="mingcute:calendar-line" size={13} />
              {dueDate ? formatDate(dueDate) : "Due date"}
            </button>
          </DatePicker>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">Color</div>
          <div className="flex flex-wrap gap-1.5">
            {colorPalette.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn("h-6 w-6 rounded-full cursor-pointer transition-transform", c === color && "scale-110 ring-2 ring-white/70")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={submit} disabled={!name.trim() || !ownerId}>
            Create goal
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const [newOpen, setNewOpen] = useState(false);

  const counts = {
    on_track: goals.filter((g) => g.status === "on_track").length,
    at_risk: goals.filter((g) => g.status === "at_risk").length,
    off_track: goals.filter((g) => g.status === "off_track").length,
    completed: goals.filter((g) => g.status === "completed").length,
  };
  const avg = goals.length ? Math.round(goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length) : 0;

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_16px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:target-line" size={18} className="text-white" />
        </span>
        <div>
          <h1 className="text-[15px] font-semibold text-white/95">Goals</h1>
          <p className="text-[11px] text-white/40">Objectives & key results for the whole workspace</p>
        </div>
        <span className="flex-1" />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="glass-soft flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-white/70">
            <Icon name="mingcute:target-line" size={13} className="text-indigo-300" />
            {goals.length} goals
          </span>
          {([["on_track", counts.on_track], ["at_risk", counts.at_risk], ["off_track", counts.off_track]] as [GoalStatus, number][]).map(
            ([st, n]) => (
              <span key={st} className="glass-soft flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs" style={{ color: goalStatusMeta[st].color }}>
                <Icon name={goalStatusMeta[st].icon} size={13} />
                {n} {goalStatusMeta[st].label.toLowerCase()}
              </span>
            )
          )}
          <span className="glass-soft flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs text-white/70">
            <ProgressBar value={avg} color="#818cf8" className="w-16" height={5} />
            {avg}% avg
          </span>
        </div>
        <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => setNewOpen(true)}>
          New goal
        </Button>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {goals.length === 0 ? (
          <EmptyState
            icon="mingcute:target-line"
            title="No goals yet"
            body="Set objectives and measurable key results to keep the team aligned."
            action={
              <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={() => setNewOpen(true)}>
                Create your first goal
              </Button>
            }
          />
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            {goals.map((g, i) => (
              <GoalCard key={g.id} goal={g} index={i} />
            ))}
          </div>
        )}
      </div>

      {newOpen && <NewGoalModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}
