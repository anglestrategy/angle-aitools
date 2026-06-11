"use client";

import type { Project } from "@/lib/types";
import { EmptyState } from "@/components/ui/primitives";

export function CalendarView({ project }: { project: Project }) {
  return <EmptyState icon="mingcute:hammer-line" title="CalendarView coming up" body={`Building this view for ${project.name}…`} />;
}
