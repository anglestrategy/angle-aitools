"use client";

import { Icon as Iconify, addCollection } from "@iconify/react";
import mingcuteIcons from "@iconify-json/mingcute/icons.json";
import { motion } from "motion/react";
import React from "react";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

// bundle the MingCute set so icons render offline & without flicker
addCollection(mingcuteIcons);

// ─── Icon ───────────────────────────────────────────────────────────────────

export function Icon({
  name,
  className,
  size,
  style,
}: {
  name: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return <Iconify icon={name} className={className} width={size ?? 18} height={size ?? 18} style={style} />;
}

// ─── Buttons ────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "glass" | "ghost" | "danger" | "subtle";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "accent-gradient text-white shadow-[0_4px_20px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110",
  glass: "glass-soft glass-hover text-white/90",
  ghost: "text-white/65 hover:text-white hover:bg-white/8",
  danger: "bg-rose-500/15 border border-rose-400/30 text-rose-300 hover:bg-rose-500/25",
  subtle: "bg-white/6 border border-white/8 text-white/80 hover:bg-white/10 hover:text-white",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "xs" | "sm" | "md" | "lg";
    icon?: string;
    iconRight?: string;
  }
>(function Button({ variant = "glass", size = "md", icon, iconRight, className, children, ...props }, ref) {
  const sizes = {
    xs: "h-6 px-2 text-[11px] gap-1 rounded-lg",
    sm: "h-8 px-3 text-xs gap-1.5 rounded-[10px]",
    md: "h-9 px-4 text-sm gap-2 rounded-xl",
    lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  };
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "inline-flex items-center justify-center font-medium select-none cursor-pointer transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap",
        sizes[size],
        buttonStyles[variant],
        className
      )}
      {...(props as object)}
    >
      {icon && <Icon name={icon} size={size === "xs" ? 13 : size === "sm" ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "xs" ? 13 : size === "sm" ? 15 : 17} />}
    </motion.button>
  );
});

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: string;
    size?: "xs" | "sm" | "md";
    active?: boolean;
    label?: string;
  }
>(function IconButton({ icon, size = "md", active, label, className, ...props }, ref) {
  const sizes = { xs: "h-6 w-6 rounded-md", sm: "h-7 w-7 rounded-lg", md: "h-9 w-9 rounded-xl" };
  const iconSizes = { xs: 13, sm: 15, md: 18 };
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.92 }}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center cursor-pointer transition-colors duration-150",
        sizes[size],
        active ? "bg-indigo-500/25 text-indigo-200" : "text-white/55 hover:text-white hover:bg-white/10",
        className
      )}
      {...(props as object)}
    >
      <Icon name={icon} size={iconSizes[size]} />
    </motion.button>
  );
});

// ─── Inputs ─────────────────────────────────────────────────────────────────

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: string; inputSize?: "sm" | "md" | "lg" }
>(function Input({ icon, inputSize = "md", className, ...props }, ref) {
  const sizes = { sm: "h-8 text-xs", md: "h-9 text-sm", lg: "h-11 text-sm" };
  if (icon) {
    return (
      <div className={cn("relative", className)}>
        <Icon name={icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
        <input ref={ref} className={cn("input-glass w-full pl-9 pr-3", sizes[inputSize])} {...props} />
      </div>
    );
  }
  return <input ref={ref} className={cn("input-glass px-3", sizes[inputSize], className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn("input-glass w-full px-3 py-2 text-sm resize-none", className)} {...props} />;
  }
);

export function Checkbox({
  checked,
  onChange,
  size = "md",
  className,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const s = size === "sm" ? "h-4 w-4 rounded-[5px]" : "h-[18px] w-[18px] rounded-md";
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={cn(
        "inline-flex items-center justify-center border transition-all duration-150 cursor-pointer shrink-0",
        s,
        checked
          ? "accent-gradient border-transparent shadow-[0_2px_10px_rgba(99,102,241,0.5)]"
          : "border-white/25 hover:border-white/50 bg-white/4",
        className
      )}
    >
      {checked && <Icon name="mingcute:check-fill" size={size === "sm" ? 11 : 13} className="text-white" />}
    </motion.button>
  );
}

export function Toggle({ on, onChange, size = "md" }: { on: boolean; onChange: (v: boolean) => void; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-8 h-[18px]" : "w-10 h-[22px]";
  const knob = size === "sm" ? 14 : 18;
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative rounded-full transition-colors duration-200 cursor-pointer shrink-0 border",
        w,
        on ? "accent-gradient border-transparent" : "bg-white/10 border-white/10"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 32 }}
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md"
        style={{ width: knob, height: knob, left: on ? `calc(100% - ${knob + 2}px)` : 2 }}
      />
    </button>
  );
}

// ─── Display ────────────────────────────────────────────────────────────────

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-white/8 border border-white/12 text-[10px] font-medium text-white/60 font-sans">
      {children}
    </kbd>
  );
}

export function Badge({
  children,
  color,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium border whitespace-nowrap",
        size === "sm" ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]",
        className
      )}
      style={
        color
          ? { backgroundColor: `${color}20`, borderColor: `${color}45`, color: lighten(color) }
          : { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
      }
    >
      {children}
    </span>
  );
}

/** lighten a hex color for legible text on translucent chips */
function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 70);
  const g = Math.min(255, ((n >> 8) & 255) + 70);
  const b = Math.min(255, (n & 255) + 70);
  return `rgb(${r},${g},${b})`;
}

export function StatusDot({ color, size = 8, ring }: { color: string; size?: number; ring?: boolean }) {
  return (
    <span
      className={cn("inline-block rounded-full shrink-0", ring && "ring-2")}
      style={{ width: size, height: size, backgroundColor: color, boxShadow: `0 0 8px ${color}80`, ...(ring ? ({ ["--tw-ring-color" as string]: `${color}40` } as React.CSSProperties) : {}) }}
    />
  );
}

export function ProgressBar({
  value,
  color = "#6366f1",
  className,
  height = 6,
}: {
  value: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  return (
    <div className={cn("w-full rounded-full bg-white/8 overflow-hidden", className)} style={{ height }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 12px ${color}60` }}
      />
    </div>
  );
}

// ─── Avatars ────────────────────────────────────────────────────────────────

export function Avatar({
  user,
  size = 28,
  showOnline,
  className,
}: {
  user: Pick<User, "name" | "initials" | "color"> & { online?: boolean };
  size?: number;
  showOnline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} title={user.name}>
      <span
        className="flex items-center justify-center rounded-full font-semibold text-white select-none"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: `linear-gradient(135deg, ${user.color}, ${user.color}99)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px ${user.color}50`,
        }}
      >
        {user.initials}
      </span>
      {showOnline && user.online && (
        <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b0d18] animate-pulse-dot" />
      )}
    </span>
  );
}

export function AvatarStack({
  users,
  size = 24,
  max = 4,
  className,
}: {
  users: Pick<User, "name" | "initials" | "color">[];
  size?: number;
  max?: number;
  className?: string;
}) {
  const visible = users.slice(0, max);
  const extra = users.length - visible.length;
  return (
    <span className={cn("inline-flex items-center", className)}>
      {visible.map((u, i) => (
        <span key={u.name + i} style={{ marginLeft: i === 0 ? 0 : -size * 0.32, zIndex: visible.length - i }} className="relative rounded-full ring-2 ring-[#11131f]">
          <Avatar user={u} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="relative flex items-center justify-center rounded-full bg-white/12 text-white/70 font-semibold ring-2 ring-[#11131f]"
          style={{ width: size, height: size, fontSize: size * 0.36, marginLeft: -size * 0.32 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

// ─── Misc ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-block rounded-full border-2 border-white/15 border-t-indigo-400 animate-spin", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}
    >
      <div className="glass-card flex items-center justify-center h-16 w-16 rounded-2xl mb-4">
        <Icon name={icon} size={28} className="text-indigo-300" />
      </div>
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      {body && <p className="mt-1.5 text-xs text-white/45 max-w-xs leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35", className)}>{children}</div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-white/8", className)} />;
}
