"use client";

import { EmptyState } from "@/components/ui/primitives";

export default function DashboardsPage() {
  return (
    <div className="glass flex h-full items-center justify-center rounded-2xl">
      <EmptyState icon="mingcute:hammer-line" title="Dashboards coming up" body="This page is being built." />
    </div>
  );
}
