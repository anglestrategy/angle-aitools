"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useUI, type Toast } from "@/lib/uiStore";
import { Icon } from "./primitives";

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useUI((s) => s.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 4200);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  const kindIcon =
    toast.icon ?? (toast.kind === "success" ? "mingcute:check-circle-fill" : toast.kind === "error" ? "mingcute:alert-fill" : "mingcute:information-fill");
  const kindColor = toast.kind === "success" ? "text-emerald-300" : toast.kind === "error" ? "text-rose-300" : "text-indigo-300";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="glass-strong rounded-xl px-4 py-3 flex items-start gap-3 w-[320px] pointer-events-auto"
    >
      <Icon name={kindIcon} size={18} className={`${kindColor} mt-px shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-white/95 leading-snug">{toast.title}</div>
        {toast.body && <div className="mt-0.5 text-xs text-white/50 leading-snug line-clamp-2">{toast.body}</div>}
      </div>
      <button onClick={() => dismiss(toast.id)} className="text-white/35 hover:text-white transition-colors cursor-pointer shrink-0">
        <Icon name="mingcute:close-line" size={14} />
      </button>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="fixed bottom-5 right-5 z-[120] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
