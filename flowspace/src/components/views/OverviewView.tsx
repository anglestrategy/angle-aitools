"use client";

import type { Project } from "@/lib/types";
import { EmptyState } from "@/components/ui/primitives";

export function OverviewView({ project }: { project: Project }) {
  return <EmptyState icon="mingcute:hammer-line" title="OverviewView coming up" body={`Building this view for ${project.name}…`} />;
}
