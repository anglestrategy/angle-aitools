"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn } from "@/lib/utils";
import { Avatar, Icon, Kbd } from "@/components/ui/primitives";

interface CmdItem {
  id: string;
  kind: "task" | "project" | "doc" | "user" | "action" | "space" | "goal" | "dashboard";
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  perform: () => void;
}

export function CommandPalette() {
  const open = useUI((s) => s.commandPaletteOpen);
  const setOpen = useUI((s) => s.setCommandPalette);
  const openTask = useUI((s) => s.openTask);
  const openNewTask = useUI((s) => s.openNewTask);
  const openNewProject = useUI((s) => s.openNewProject);
  const setNewSpaceModal = useUI((s) => s.setNewSpaceModal);
  const router = useRouter();

  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const spaces = useStore((s) => s.spaces);
  const docs = useStore((s) => s.docs);
  const users = useStore((s) => s.users);
  const goals = useStore((s) => s.goals);
  const dashboards = useStore((s) => s.dashboards);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUI.getState().commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const go = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const items = useMemo<CmdItem[]>(() => {
    const actions: CmdItem[] = [
      { id: "act-new-task", kind: "action", icon: "mingcute:add-circle-line", title: "Create new task", keywords: "add create task new", perform: () => { setOpen(false); openNewTask(); } },
      { id: "act-new-project", kind: "action", icon: "mingcute:folder-2-line", title: "Create new project", keywords: "add create project new list board", perform: () => { setOpen(false); openNewProject(); } },
      { id: "act-new-space", kind: "action", icon: "mingcute:box-3-line", title: "Create new space", keywords: "add create space new", perform: () => { setOpen(false); setNewSpaceModal(true); } },
      { id: "act-home", kind: "action", icon: "mingcute:home-4-line", title: "Go to Home", keywords: "home overview", perform: () => go("/app/home") },
      { id: "act-mytasks", kind: "action", icon: "mingcute:checkbox-line", title: "Go to My Tasks", keywords: "my tasks assigned", perform: () => go("/app/my-tasks") },
      { id: "act-inbox", kind: "action", icon: "mingcute:inbox-line", title: "Go to Inbox", keywords: "inbox notifications", perform: () => go("/app/inbox") },
      { id: "act-goals", kind: "action", icon: "mingcute:target-line", title: "Go to Goals", keywords: "goals okr", perform: () => go("/app/goals") },
      { id: "act-docs", kind: "action", icon: "mingcute:document-2-line", title: "Go to Docs", keywords: "docs documents wiki", perform: () => go("/app/docs") },
      { id: "act-dash", kind: "action", icon: "mingcute:chart-pie-2-line", title: "Go to Dashboards", keywords: "dashboards reports analytics", perform: () => go("/app/dashboards") },
      { id: "act-timesheet", kind: "action", icon: "mingcute:time-line", title: "Go to Timesheet", keywords: "time tracking timesheet hours", perform: () => go("/app/timesheet") },
      { id: "act-autos", kind: "action", icon: "mingcute:lightning-line", title: "Go to Automations", keywords: "automations rules workflows", perform: () => go("/app/automations") },
      { id: "act-integrations", kind: "action", icon: "mingcute:plugin-2-line", title: "Go to Integrations", keywords: "integrations apps connect", perform: () => go("/app/integrations") },
      { id: "act-settings", kind: "action", icon: "mingcute:settings-3-line", title: "Go to Settings", keywords: "settings workspace members", perform: () => go("/app/settings") },
    ];
    const taskItems: CmdItem[] = tasks
      .filter((t) => !t.archived)
      .map((t) => {
        const p = projects.find((x) => x.id === t.projectId);
        return {
          id: t.id,
          kind: "task" as const,
          icon: "mingcute:task-2-line",
          iconColor: p?.color,
          title: t.title,
          subtitle: p?.name,
          perform: () => {
            setOpen(false);
            openTask(t.id);
          },
        };
      });
    const projectItems: CmdItem[] = projects
      .filter((p) => !p.archived)
      .map((p) => ({
        id: p.id,
        kind: "project" as const,
        icon: p.icon,
        iconColor: p.color,
        title: p.name,
        subtitle: spaces.find((s) => s.id === p.spaceId)?.name,
        perform: () => go(`/app/projects/${p.id}`),
      }));
    const spaceItems: CmdItem[] = spaces.map((s) => ({
      id: s.id,
      kind: "space" as const,
      icon: s.icon,
      iconColor: s.color,
      title: s.name,
      subtitle: "Space",
      perform: () => go(`/app/spaces/${s.id}`),
    }));
    const docItems: CmdItem[] = docs.map((dd) => ({
      id: dd.id,
      kind: "doc" as const,
      icon: dd.icon,
      title: dd.title,
      subtitle: "Doc",
      perform: () => go(`/app/docs/${dd.id}`),
    }));
    const userItems: CmdItem[] = users.map((u) => ({
      id: u.id,
      kind: "user" as const,
      icon: "",
      title: u.name,
      subtitle: u.title,
      perform: () => go("/app/settings/members"),
    }));
    const goalItems: CmdItem[] = goals.map((g) => ({
      id: g.id,
      kind: "goal" as const,
      icon: "mingcute:target-line",
      iconColor: g.color,
      title: g.name,
      subtitle: "Goal",
      perform: () => go("/app/goals"),
    }));
    const dashItems: CmdItem[] = dashboards.map((dd) => ({
      id: dd.id,
      kind: "dashboard" as const,
      icon: dd.icon,
      title: dd.name,
      subtitle: "Dashboard",
      perform: () => go(`/app/dashboards/${dd.id}`),
    }));
    return [...actions, ...taskItems, ...projectItems, ...spaceItems, ...docItems, ...goalItems, ...dashItems, ...userItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projects, spaces, docs, users, goals, dashboards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items.filter((i) => i.kind === "action").slice(0, 10);
    }
    const scored = items
      .map((i) => {
        const hay = `${i.title} ${i.subtitle ?? ""} ${i.keywords ?? ""}`.toLowerCase();
        let score = -1;
        if (i.title.toLowerCase().startsWith(q)) score = 3;
        else if (i.title.toLowerCase().includes(q)) score = 2;
        else if (hay.includes(q)) score = 1;
        return { i, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 14).map((x) => x.i);
  }, [items, query]);

  useEffect(() => setActive(0), [filtered.length, query]);

  // keep active item in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const kindLabel: Record<CmdItem["kind"], string> = {
    action: "Actions",
    task: "Tasks",
    project: "Projects",
    space: "Spaces",
    doc: "Docs",
    goal: "Goals",
    dashboard: "Dashboards",
    user: "People",
  };

  // group while preserving order
  const groups: { label: string; items: { item: CmdItem; idx: number }[] }[] = [];
  filtered.forEach((item, idx) => {
    const label = kindLabel[item.kind];
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push({ item, idx });
    else groups.push({ label, items: [{ item, idx }] });
  });

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[95] flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[14vh] px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="glass-strong w-full max-w-xl rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-white/8 px-4">
              <Icon name="mingcute:search-line" size={18} className="text-white/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(filtered.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    filtered[active]?.perform();
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Search or jump to…"
                className="h-13 flex-1 bg-transparent py-4 text-[15px] text-white placeholder:text-white/30 outline-none"
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">{g.label}</div>
                  {g.items.map(({ item, idx }) => (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => item.perform()}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer",
                        idx === active ? "bg-indigo-500/20" : "hover:bg-white/5"
                      )}
                    >
                      {item.kind === "user" ? (
                        <Avatar user={users.find((u) => u.id === item.id)!} size={24} />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/6">
                          <Icon name={item.icon} size={15} className="text-white/70" style={item.iconColor ? { color: item.iconColor } : undefined} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[13px]", idx === active ? "text-white" : "text-white/85")}>{item.title}</span>
                        {item.subtitle && <span className="block truncate text-[11px] text-white/35">{item.subtitle}</span>}
                      </span>
                      {idx === active && <Icon name="mingcute:corner-down-left-line" size={14} className="text-white/35 shrink-0" />}
                    </button>
                  ))}
                </div>
              ))}
              {!filtered.length && (
                <div className="py-10 text-center">
                  <Icon name="mingcute:ghost-line" size={28} className="mx-auto text-white/20" />
                  <p className="mt-2 text-sm text-white/40">No results for “{query}”</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-white/8 px-4 py-2.5 text-[10px] text-white/30">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> open
              </span>
              <span className="flex items-center gap-1">
                <Kbd>esc</Kbd> close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
