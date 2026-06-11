"use client";

import type { Project } from "@/lib/types";
import { EmptyState } from "@/components/ui/primitives";

export function TableView({ project }: { project: Project }) {
  return <EmptyState icon="mingcute:hammer-line" title="TableView coming up" body={`Building this view for ${project.name}…`} />;
}
