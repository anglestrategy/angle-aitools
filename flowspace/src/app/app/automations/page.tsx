"use client";

import { EmptyState } from "@/components/ui/primitives";

export default function AutomationsPage() {
  return (
    <div className="glass flex h-full items-center justify-center rounded-2xl">
      <EmptyState icon="mingcute:hammer-line" title="Automations coming up" body="This page is being built." />
    </div>
  );
}
