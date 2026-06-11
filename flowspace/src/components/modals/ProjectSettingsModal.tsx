"use client";

import type { Project } from "@/lib/types";
import { Modal, ModalHeader } from "@/components/ui/overlay";

export function ProjectSettingsModal({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title={`${project.name} settings`} icon="mingcute:settings-3-line" onClose={onClose} />
      <div className="p-5 text-sm text-white/50">Coming up…</div>
    </Modal>
  );
}
