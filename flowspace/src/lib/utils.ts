import { customAlphabet } from "nanoid";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";
import type { Priority, Status, Task } from "./types";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export const uid = (prefix = "") => (prefix ? `${prefix}_${nano()}` : nano());

export const nowIso = () => new Date().toISOString();
export const todayStr = () => format(new Date(), "yyyy-MM-dd");

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Dates ──────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return isThisYear(d) ? format(d, "MMM d") : format(d, "MMM d, yyyy");
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  return isThisYear(d) ? format(d, "MMM d, h:mm a") : format(d, "MMM d, yyyy");
}

export function timeAgo(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export type DueState = "overdue" | "today" | "soon" | "future" | "none";

export function dueState(dueDate: string | null, completed: boolean): DueState {
  if (!dueDate || completed) return "none";
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 3) return "soon";
  return "future";
}

export const dueStateColor: Record<DueState, string> = {
  overdue: "text-rose-400",
  today: "text-amber-300",
  soon: "text-yellow-200/80",
  future: "text-white/55",
  none: "text-white/40",
};

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ─── Priority ───────────────────────────────────────────────────────────────

export const priorityMeta: Record<
  Priority,
  { label: string; color: string; bg: string; icon: string; rank: number }
> = {
  urgent: { label: "Urgent", color: "#fb7185", bg: "rgba(251,113,133,0.15)", icon: "mingcute:alert-fill", rank: 0 },
  high: { label: "High", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", icon: "mingcute:flag-2-fill", rank: 1 },
  normal: { label: "Normal", color: "#38bdf8", bg: "rgba(56,189,248,0.15)", icon: "mingcute:flag-2-fill", rank: 2 },
  low: { label: "Low", color: "#94a3b8", bg: "rgba(148,163,184,0.15)", icon: "mingcute:flag-2-line", rank: 3 },
  none: { label: "No priority", color: "#64748b", bg: "rgba(100,116,139,0.12)", icon: "mingcute:minimize-line", rank: 4 },
};

export const priorities: Priority[] = ["urgent", "high", "normal", "low", "none"];

// ─── Status helpers ─────────────────────────────────────────────────────────

export function statusOf(task: Task, statuses: Status[]): Status | undefined {
  return statuses.find((s) => s.id === task.statusId);
}

export function isDone(task: Task, statuses: Status[]): boolean {
  const s = statusOf(task, statuses);
  return s?.kind === "done" || s?.kind === "closed";
}

// ─── Misc ───────────────────────────────────────────────────────────────────

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function pluralize(n: number, word: string, plural?: string) {
  return `${n} ${n === 1 ? word : plural ?? word + "s"}`;
}

/** deterministic hash → index, for stable pseudo-random picks */
export function hashIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

export const gradientPalette = [
  "linear-gradient(135deg,#6366f1,#a855f7)",
  "linear-gradient(135deg,#0ea5e9,#6366f1)",
  "linear-gradient(135deg,#f43f5e,#f97316)",
  "linear-gradient(135deg,#10b981,#0ea5e9)",
  "linear-gradient(135deg,#a855f7,#ec4899)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#14b8a6,#84cc16)",
];

export const colorPalette = [
  "#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#f97316",
  "#f59e0b", "#84cc16", "#10b981", "#14b8a6", "#0ea5e9",
  "#3b82f6", "#8b5cf6",
];
