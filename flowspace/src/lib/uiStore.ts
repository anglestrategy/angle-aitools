"use client";

import { create } from "zustand";
import type { ID } from "./types";
import { uid } from "./utils";

export interface Toast {
  id: string;
  title: string;
  body?: string;
  icon?: string;
  kind: "success" | "info" | "error";
}

export interface NewTaskDefaults {
  projectId?: ID;
  statusId?: ID;
  parentId?: ID;
  dueDate?: string;
  assigneeIds?: ID[];
}

interface UIState {
  sidebarCollapsed: boolean;
  selectedTaskId: ID | null;
  commandPaletteOpen: boolean;
  notificationsOpen: boolean;
  newTaskModal: NewTaskDefaults | null;
  newProjectModalSpaceId: ID | "any" | null;
  newSpaceModalOpen: boolean;
  toasts: Toast[];

  toggleSidebar: () => void;
  openTask: (id: ID) => void;
  closeTask: () => void;
  setCommandPalette: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  openNewTask: (defaults?: NewTaskDefaults) => void;
  closeNewTask: () => void;
  openNewProject: (spaceId?: ID) => void;
  closeNewProject: () => void;
  setNewSpaceModal: (open: boolean) => void;
  toast: (title: string, opts?: { body?: string; icon?: string; kind?: Toast["kind"] }) => void;
  dismissToast: (id: string) => void;
}

export const useUI = create<UIState>((set) => ({
  sidebarCollapsed: false,
  selectedTaskId: null,
  commandPaletteOpen: false,
  notificationsOpen: false,
  newTaskModal: null,
  newProjectModalSpaceId: null,
  newSpaceModalOpen: false,
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openTask: (id) => set({ selectedTaskId: id }),
  closeTask: () => set({ selectedTaskId: null }),
  setCommandPalette: (open) => set({ commandPaletteOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  openNewTask: (defaults = {}) => set({ newTaskModal: defaults }),
  closeNewTask: () => set({ newTaskModal: null }),
  openNewProject: (spaceId) => set({ newProjectModalSpaceId: spaceId ?? "any" }),
  closeNewProject: () => set({ newProjectModalSpaceId: null }),
  setNewSpaceModal: (open) => set({ newSpaceModalOpen: open }),
  toast: (title, opts) =>
    set((s) => ({
      toasts: [
        ...s.toasts.slice(-4),
        { id: uid("toast"), title, body: opts?.body, icon: opts?.icon, kind: opts?.kind ?? "success" },
      ],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
