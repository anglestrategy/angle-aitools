"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import type { Doc, Space } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Icon, IconButton, Input, SectionLabel } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";

// ─── Doc card ────────────────────────────────────────────────────────────────

function DocCard({ doc, space, index }: { doc: Doc; space: Space | null; index: number }) {
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const users = useStore((s) => s.users);
  const favorites = useStore((s) => s.favorites.docs);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const createDoc = useStore((s) => s.createDoc);
  const updateDoc = useStore((s) => s.updateDoc);
  const deleteDoc = useStore((s) => s.deleteDoc);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(doc.title);

  const author = users.find((u) => u.id === doc.createdBy);
  const fav = favorites.includes(doc.id);

  const commitRename = () => {
    setRenaming(false);
    const next = name.trim();
    if (next && next !== doc.title) {
      updateDoc(doc.id, { title: next });
      toast("Doc renamed", { body: next, icon: "mingcute:edit-2-line" });
    } else {
      setName(doc.title);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(index * 0.04, 0.4) }}
        onClick={() => !renaming && router.push(`/app/doc?id=${doc.id}`)}
        className="glass-card glass-hover sheen group relative cursor-pointer overflow-hidden"
      >
        {/* cover banner */}
        <div
          className="relative h-16 w-full"
          style={doc.coverGradient ? { background: doc.coverGradient } : { background: "rgba(255,255,255,0.035)" }}
        >
          <div className="absolute right-2 top-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="sm"
              icon={fav ? "mingcute:star-fill" : "mingcute:star-line"}
              label={fav ? "Remove from favorites" : "Add to favorites"}
              className={cn(
                "bg-black/25 backdrop-blur-sm",
                fav ? "text-amber-300 hover:text-amber-200" : "text-white/70 opacity-0 group-hover:opacity-100"
              )}
              onClick={() => toggleFavorite("docs", doc.id)}
            />
            <Popover
              width={190}
              align="end"
              trigger={
                <IconButton
                  size="sm"
                  icon="mingcute:more-1-line"
                  label="Doc actions"
                  className="bg-black/25 text-white/70 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                />
              }
            >
              <MenuList>
                <MenuItem
                  icon="mingcute:edit-2-line"
                  label="Rename"
                  onClick={() => {
                    setName(doc.title);
                    setRenaming(true);
                  }}
                />
                <MenuItem
                  icon="mingcute:copy-2-line"
                  label="Duplicate"
                  onClick={() => {
                    const id = createDoc({
                      title: `${doc.title} (copy)`,
                      content: doc.content,
                      icon: doc.icon,
                      coverGradient: doc.coverGradient,
                      spaceId: doc.spaceId,
                    });
                    toast("Doc duplicated", { body: `${doc.title} (copy)`, icon: "mingcute:copy-2-line" });
                    router.push(`/app/doc?id=${id}`);
                  }}
                />
                <MenuSeparator />
                <MenuItem icon="mingcute:delete-2-line" label="Delete" danger onClick={() => setConfirmDelete(true)} />
              </MenuList>
            </Popover>
          </div>
        </div>

        {/* icon tile overlapping the banner */}
        <div className="px-4">
          <span className="glass-strong -mt-5 flex h-10 w-10 items-center justify-center rounded-xl">
            <Icon name={doc.icon} size={19} className="text-indigo-200" />
          </span>
        </div>

        <div className="px-4 pb-4 pt-2.5">
          {renaming ? (
            <input
              autoFocus
              value={name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setName(doc.title);
                  setRenaming(false);
                }
              }}
              className="input-glass h-7 w-full px-2 text-sm font-semibold"
            />
          ) : (
            <h3 className="truncate text-sm font-semibold text-white/90">{doc.title}</h3>
          )}
          <div className="mt-2 flex items-center gap-2">
            {space ? (
              <Badge color={space.color} size="sm">
                <Icon name={space.icon} size={10} />
                {space.name}
              </Badge>
            ) : (
              <Badge size="sm">
                <Icon name="mingcute:building-2-line" size={10} />
                Workspace
              </Badge>
            )}
            <span className="truncate text-[10px] text-white/35">Updated {timeAgo(doc.updatedAt)}</span>
            <span className="flex-1" />
            {author && <Avatar user={author} size={20} />}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${doc.title}”?`}
        body="This doc will be permanently removed. This cannot be undone."
        onConfirm={() => {
          deleteDoc(doc.id);
          toast("Doc deleted", { body: doc.title, icon: "mingcute:delete-2-line", kind: "info" });
        }}
      />
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const docs = useStore((s) => s.docs);
  const spaces = useStore((s) => s.spaces);
  const favorites = useStore((s) => s.favorites.docs);
  const createDoc = useStore((s) => s.createDoc);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [...docs].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return q ? base.filter((d) => d.title.toLowerCase().includes(q)) : base;
  }, [docs, query]);

  const favDocs = filtered.filter((d) => favorites.includes(d.id));
  const rest = filtered.filter((d) => !favorites.includes(d.id));
  const spaceGroups: { space: Space | null; docs: Doc[] }[] = spaces
    .filter((sp) => !sp.archived)
    .map((sp) => ({ space: sp as Space | null, docs: rest.filter((d) => d.spaceId === sp.id) }))
    .filter((g) => g.docs.length > 0);
  const workspaceDocs = rest.filter((d) => !d.spaceId || !spaces.some((sp) => sp.id === d.spaceId));
  if (workspaceDocs.length) spaceGroups.push({ space: null, docs: workspaceDocs });

  const newDoc = () => {
    const id = createDoc();
    toast("Doc created", { body: "Untitled doc", icon: "mingcute:document-2-line" });
    router.push(`/app/doc?id=${id}`);
  };

  const sections: { key: string; label: React.ReactNode; docs: Doc[] }[] = [
    ...(favDocs.length
      ? [
          {
            key: "favorites",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="mingcute:star-fill" size={11} className="text-amber-300" />
                Favorites
              </span>
            ),
            docs: favDocs,
          },
        ]
      : []),
    ...spaceGroups.map((g) => ({
      key: g.space?.id ?? "workspace",
      label: g.space ? (
        <span className="inline-flex items-center gap-1.5">
          <Icon name={g.space.icon} size={11} style={{ color: g.space.color }} />
          {g.space.name}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <Icon name="mingcute:building-2-line" size={11} />
          Workspace
        </span>
      ),
      docs: g.docs,
    })),
  ];

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_16px_rgba(99,102,241,0.4)]">
          <Icon name="mingcute:document-2-line" size={18} className="text-white" />
        </span>
        <div>
          <h1 className="text-[15px] font-semibold text-white/95">Docs</h1>
          <p className="text-[11px] text-white/40">
            {docs.length} doc{docs.length === 1 ? "" : "s"} across the workspace
          </p>
        </div>
        <span className="flex-1" />
        <Input
          icon="mingcute:search-line"
          inputSize="sm"
          placeholder="Search docs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-56"
        />
        <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={newDoc}>
          New doc
        </Button>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {docs.length === 0 ? (
          <EmptyState
            icon="mingcute:document-2-line"
            title="No docs yet"
            body="Write specs, briefs and meeting notes right next to your work."
            action={
              <Button variant="primary" size="sm" icon="mingcute:add-line" onClick={newDoc}>
                Create your first doc
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon="mingcute:search-line" title="No matching docs" body={`Nothing found for “${query.trim()}”.`} />
        ) : (
          <div className="space-y-7">
            {sections.map((section) => (
              <div key={section.key}>
                <div className="mb-3 flex items-center gap-2">
                  <SectionLabel>{section.label}</SectionLabel>
                  <span className="text-[10px] text-white/25">{section.docs.length}</span>
                  <div className="h-px flex-1 bg-white/6" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {section.docs.map((doc, i) => (
                    <DocCard key={doc.id} doc={doc} index={i} space={spaces.find((sp) => sp.id === doc.spaceId) ?? null} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
