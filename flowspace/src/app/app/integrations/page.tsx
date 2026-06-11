"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Integration } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, Button, EmptyState, Icon, Input } from "@/components/ui/primitives";

type Category = Integration["category"];

const categoryMeta: Record<Category, { label: string; icon: string }> = {
  communication: { label: "Communication", icon: "mingcute:message-3-line" },
  dev: { label: "Developer", icon: "mingcute:code-line" },
  storage: { label: "Storage", icon: "mingcute:folder-2-line" },
  design: { label: "Design", icon: "mingcute:palette-line" },
  calendar: { label: "Calendar", icon: "mingcute:calendar-line" },
  ai: { label: "AI & Automation", icon: "mingcute:sparkles-line" },
  crm: { label: "CRM", icon: "mingcute:building-2-line" },
};

const categories = Object.keys(categoryMeta) as Category[];

function IntegrationCard({ integration, index }: { integration: Integration; index: number }) {
  const toast = useUI((s) => s.toast);
  const toggleIntegration = useStore((s) => s.toggleIntegration);
  const cat = categoryMeta[integration.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(index * 0.04, 0.4) }}
      className={cn(
        "glass-card sheen flex flex-col p-4 transition-colors",
        integration.connected && "border-emerald-400/25 shadow-[0_0_24px_rgba(52,211,153,0.07)]"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${integration.color}20`, color: integration.color }}
        >
          <Icon name={integration.icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white/92">{integration.name}</h3>
            {integration.connected && (
              <Badge color="#34d399" size="sm">
                <Icon name="mingcute:check-circle-fill" size={10} />
                Connected
              </Badge>
            )}
          </div>
          <Badge size="sm" className="mt-1">
            <Icon name={cat.icon} size={10} />
            {cat.label}
          </Badge>
        </div>
      </div>
      <p className="mt-3 flex-1 text-xs leading-relaxed text-white/50">{integration.description}</p>
      <div className="mt-4">
        <Button
          size="sm"
          variant={integration.connected ? "subtle" : "primary"}
          icon={integration.connected ? "mingcute:unlink-line" : "mingcute:link-line"}
          className="w-full"
          onClick={() => {
            toggleIntegration(integration.id);
            if (integration.connected) {
              toast("Integration disconnected", { body: integration.name, icon: "mingcute:unlink-line", kind: "info" });
            } else {
              toast("Integration connected", { body: `${integration.name} is now linked to your workspace`, icon: "mingcute:check-circle-fill" });
            }
          }}
        >
          {integration.connected ? "Disconnect" : "Connect"}
        </Button>
      </div>
    </motion.div>
  );
}

export default function IntegrationsPage() {
  const toast = useUI((s) => s.toast);
  const integrations = useStore((s) => s.integrations);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return integrations.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [integrations, query, category]);

  const connectedCount = integrations.filter((i) => i.connected).length;
  const countFor = (c: Category) => integrations.filter((i) => i.category === c).length;

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_16px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:plugin-2-line" size={18} className="text-white" />
        </span>
        <div>
          <h1 className="text-[15px] font-semibold text-white/95">Integrations</h1>
          <p className="text-[11px] text-white/40">
            {connectedCount} of {integrations.length} connected
          </p>
        </div>
        <span className="flex-1" />
        <Input
          icon="mingcute:search-line"
          inputSize="sm"
          placeholder="Search integrations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-56"
        />
      </div>

      {/* category chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/8 px-5 py-2.5">
        <button
          onClick={() => setCategory("all")}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors cursor-pointer",
            category === "all" ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-100" : "border-white/10 text-white/55 hover:bg-white/6 hover:text-white"
          )}
        >
          All
          <span className="text-[10px] opacity-60">{integrations.length}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors cursor-pointer",
              category === c ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-100" : "border-white/10 text-white/55 hover:bg-white/6 hover:text-white"
            )}
          >
            <Icon name={categoryMeta[c].icon} size={12} />
            {categoryMeta[c].label}
            <span className="text-[10px] opacity-60">{countFor(c)}</span>
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <EmptyState icon="mingcute:search-line" title="No integrations found" body="Try a different search or category." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((i, idx) => (
              <IntegrationCard key={i.id} integration={i} index={idx} />
            ))}
            {/* request integration card */}
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(filtered.length * 0.04, 0.45) }}
              onClick={() => toast("Request sent", { body: "Our team will look into it — thanks for the idea!", icon: "mingcute:mail-line" })}
              className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 p-4 text-center transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/6 cursor-pointer"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/6 text-indigo-300">
                <Icon name="mingcute:add-line" size={22} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white/85">Request an integration</span>
                <span className="mt-1 block text-xs text-white/40">Missing a tool you love? Tell us and we’ll build it.</span>
              </span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
