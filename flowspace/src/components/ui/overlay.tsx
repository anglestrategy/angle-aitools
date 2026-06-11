"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Icon } from "./primitives";

// ─── Portal helper ──────────────────────────────────────────────────────────

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  children,
  width = 560,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[90] flex items-start justify-center bg-black/55 backdrop-blur-sm overflow-y-auto py-[8vh] px-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn("glass-strong rounded-2xl w-full", className)}
              style={{ maxWidth: width }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function ModalHeader({
  title,
  icon,
  onClose,
  children,
}: {
  title: React.ReactNode;
  icon?: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
      {icon && (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg accent-gradient shadow-[0_4px_14px_rgba(99,102,241,0.4)]">
          <Icon name={icon} size={16} className="text-white" />
        </span>
      )}
      <h2 className="flex-1 text-[15px] font-semibold text-white/95">{title}</h2>
      {children}
      <button
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Icon name="mingcute:close-line" size={16} />
      </button>
    </div>
  );
}

// ─── Popover (anchored floating panel) ──────────────────────────────────────

interface PopoverCtx {
  close: () => void;
}
const PopoverContext = createContext<PopoverCtx | null>(null);
export const usePopover = () => useContext(PopoverContext);

export function Popover({
  trigger,
  children,
  align = "start",
  side = "bottom",
  width,
  open: controlledOpen,
  onOpenChange,
  disabled,
  className,
  triggerClassName,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "start" | "end" | "center";
  side?: "bottom" | "top" | "right" | "left";
  width?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      setUncontrolledOpen(v);
      onOpenChange?.(v);
    },
    [onOpenChange]
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const reposition = useCallback(() => {
    const t = triggerRef.current;
    const p = panelRef.current;
    if (!t || !p) return;
    const r = t.getBoundingClientRect();
    const pw = p.offsetWidth;
    const ph = p.offsetHeight;
    const gap = 6;
    let top = 0;
    let left = 0;
    if (side === "bottom" || side === "top") {
      top = side === "bottom" ? r.bottom + gap : r.top - ph - gap;
      left = align === "start" ? r.left : align === "end" ? r.right - pw : r.left + r.width / 2 - pw / 2;
      if (top + ph > window.innerHeight - 8 && side === "bottom") top = r.top - ph - gap;
      if (top < 8) top = Math.max(8, r.bottom + gap);
    } else {
      left = side === "right" ? r.right + gap : r.left - pw - gap;
      top = align === "start" ? r.top : align === "end" ? r.bottom - ph : r.top + r.height / 2 - ph / 2;
    }
    left = Math.min(Math.max(8, left), window.innerWidth - pw - 8);
    top = Math.min(Math.max(8, top), window.innerHeight - ph - 8);
    setPos({ top, left });
  }, [align, side]);

  useLayoutEffect(() => {
    if (open) {
      // wait a frame so the panel has dimensions
      requestAnimationFrame(reposition);
    } else {
      setPos(null);
    }
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition, setOpen]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("inline-flex min-w-0", triggerClassName)}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {trigger}
      </div>
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.96, y: side === "top" ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: side === "top" ? 4 : -4 }}
              transition={{ type: "spring", stiffness: 480, damping: 32 }}
              className={cn("glass-strong rounded-xl z-[100] fixed", className)}
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, visibility: pos ? "visible" : "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <PopoverContext.Provider value={{ close }}>
                {typeof children === "function" ? children(close) : children}
              </PopoverContext.Provider>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

// ─── Menu items (used inside Popover) ───────────────────────────────────────

export function MenuList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-1.5 max-h-[340px] overflow-y-auto", className)}>{children}</div>;
}

export function MenuItem({
  icon,
  label,
  hint,
  danger,
  active,
  color,
  onClick,
  trailing,
}: {
  icon?: string;
  label: React.ReactNode;
  hint?: string;
  danger?: boolean;
  active?: boolean;
  color?: string;
  onClick?: (e: React.MouseEvent) => void;
  trailing?: React.ReactNode;
}) {
  const pop = usePopover();
  return (
    <button
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) pop?.close();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors duration-100 cursor-pointer text-left",
        danger ? "text-rose-300 hover:bg-rose-500/15" : active ? "bg-indigo-500/20 text-indigo-100" : "text-white/80 hover:bg-white/8 hover:text-white"
      )}
    >
      {icon && <Icon name={icon} size={15} className={danger ? "text-rose-400" : "text-white/50"} style={color ? { color } : undefined} />}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[10px] text-white/30">{hint}</span>}
      {active && !trailing && <Icon name="mingcute:check-line" size={14} className="text-indigo-300" />}
      {trailing}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-white/8 mx-1" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">{children}</div>;
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

export function Tooltip({ label, children, side = "top" }: { label: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  return (
    <div
      ref={ref}
      className="inline-flex"
      onMouseEnter={() => {
        const r = ref.current?.getBoundingClientRect();
        if (r) {
          setPos({ top: side === "top" ? r.top - 8 : r.bottom + 8, left: r.left + r.width / 2 });
          setShow(true);
        }
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <Portal>
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.13 }}
              className="fixed z-[110] glass-strong rounded-lg px-2.5 py-1.5 text-[11px] text-white/85 pointer-events-none whitespace-nowrap"
              style={{ top: pos.top, left: pos.left, transform: `translate(-50%, ${side === "top" ? "-100%" : "0"})` }}
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

// ─── Confirm dialog ─────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", danger ? "bg-rose-500/15" : "bg-indigo-500/15")}>
            <Icon name={danger ? "mingcute:delete-2-line" : "mingcute:question-line"} size={18} className={danger ? "text-rose-300" : "text-indigo-300"} />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white/95">{title}</h3>
            {body && <p className="mt-1 text-xs text-white/50 leading-relaxed">{body}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-3 rounded-lg text-xs font-medium text-white/65 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              danger ? "bg-rose-500/20 border border-rose-400/30 text-rose-200 hover:bg-rose-500/30" : "accent-gradient text-white"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
