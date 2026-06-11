"use client";

import type { Project } from "@/lib/types";
import { EmptyState } from "@/components/ui/primitives";

export function ActivityView({ project }: { project: Project }) {
  return <EmptyState icon="mingcute:hammer-line" title="ActivityView coming up" body={`Building this view for ${project.name}…`} />;
}
