"use client";

import type { Project } from "@/lib/types";
import { EmptyState } from "@/components/ui/primitives";

export function ListView({ project }: { project: Project }) {
  return <EmptyState icon="mingcute:hammer-line" title="ListView coming up" body={`Building this view for ${project.name}…`} />;
}
