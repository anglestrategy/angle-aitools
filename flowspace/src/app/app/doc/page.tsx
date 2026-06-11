"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn, gradientPalette, timeAgo } from "@/lib/utils";
import { Button, EmptyState, Icon, IconButton } from "@/components/ui/primitives";
import { ConfirmDialog, MenuItem, MenuLabel, MenuList, Popover, Tooltip } from "@/components/ui/overlay";

const docIcons = [
  "mingcute:document-2-line",
  "mingcute:book-2-line",
  "mingcute:notebook-line",
  "mingcute:quill-pen-line",
  "mingcute:target-line",
  "mingcute:bulb-line",
  "mingcute:mic-line",
  "mingcute:calendar-2-line",
  "mingcute:magic-3-line",
  "mingcute:flask-line",
];

// ─── Formatting toolbar ──────────────────────────────────────────────────────

function ToolbarButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label}>
      <button
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
          active ? "bg-indigo-500/25 text-indigo-200" : "text-white/55 hover:bg-white/8 hover:text-white"
        )}
      >
        <Icon name={icon} size={15} />
      </button>
    </Tooltip>
  );
}

function FormatToolbar({ editor }: { editor: Editor }) {
  const sep = <span className="mx-1 h-4 w-px bg-white/10" />;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/8 px-4 py-1.5">
      <ToolbarButton icon="mingcute:bold-line" label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton icon="mingcute:italic-line" label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton icon="mingcute:strikethrough-line" label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarButton icon="mingcute:code-line" label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
      {sep}
      <ToolbarButton icon="mingcute:heading-1-line" label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolbarButton icon="mingcute:heading-2-line" label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton icon="mingcute:heading-3-line" label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      {sep}
      <ToolbarButton icon="mingcute:menu-line" label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton icon="mingcute:list-ordered-line" label="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton icon="mingcute:checkbox-line" label="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} />
      <ToolbarButton icon="mingcute:quote-left-line" label="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton icon="mingcute:minimize-line" label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      {sep}
      <ToolbarButton icon="mingcute:back-2-line" label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      <ToolbarButton icon="mingcute:forward-2-line" label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DocEditorInner() {
  const docId = useSearchParams().get("id");
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const doc = useStore((s) => s.docs.find((d) => d.id === docId));
  const spaces = useStore((s) => s.spaces);
  const favorites = useStore((s) => s.favorites.docs);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const updateDoc = useStore((s) => s.updateDoc);
  const deleteDoc = useStore((s) => s.deleteDoc);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedDocId = useRef<string | null>(null);
  const updateDocRef = useRef(updateDoc);
  const docIdRef = useRef(docId);

  useEffect(() => {
    updateDocRef.current = updateDoc;
    docIdRef.current = docId;
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: doc?.content ?? "",
    // tiptap v3: avoid SSR hydration mismatch
    immediatelyRender: false,
    // re-render so toolbar active states stay in sync
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: "prose-glass focus:outline-none min-h-[400px]" },
    },
    onUpdate: ({ editor }) => {
      // capture eagerly so a doc switch during the debounce can't clobber content
      const id = docIdRef.current;
      if (!id) return;
      const html = editor.getHTML();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateDocRef.current(id, { content: html }), 600);
    },
  });

  // load content when navigating between docs (only when the doc id changed,
  // never while typing inside the same doc)
  useEffect(() => {
    if (!editor || !doc) return;
    if (loadedDocId.current !== doc.id) {
      loadedDocId.current = doc.id;
      editor.commands.setContent(doc.content, { emitUpdate: false });
    }
  }, [editor, doc]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  if (!doc) {
    return (
      <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
        <EmptyState
          icon="mingcute:document-2-line"
          title="Doc not found"
          body="This doc may have been deleted."
          className="m-auto"
          action={
            <Button variant="glass" size="sm" icon="mingcute:arrow-left-line" onClick={() => router.push("/app/docs")}>
              Back to docs
            </Button>
          }
        />
      </div>
    );
  }

  const fav = favorites.includes(doc.id);
  const space = spaces.find((sp) => sp.id === doc.spaceId) ?? null;

  const commitTitle = (raw: string) => {
    const next = raw.trim() || "Untitled doc";
    if (next !== doc.title) updateDoc(doc.id, { title: next });
  };

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl overflow-hidden">
      {/* sticky header toolbar */}
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <Link
          href="/app/docs"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          title="Back to docs"
        >
          <Icon name="mingcute:arrow-left-line" size={17} />
        </Link>

        {/* icon picker */}
        <Popover
          width={232}
          trigger={
            <button className="glass-soft glass-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-xl cursor-pointer" title="Change icon">
              <Icon name={doc.icon} size={18} className="text-indigo-200" />
            </button>
          }
        >
          {(close) => (
            <div className="p-2.5">
              <div className="grid grid-cols-5 gap-1">
                {docIcons.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => {
                      updateDoc(doc.id, { icon: ic });
                      close();
                    }}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg cursor-pointer transition-colors",
                      ic === doc.icon ? "bg-indigo-500/25 text-indigo-200" : "text-white/60 hover:bg-white/8"
                    )}
                  >
                    <Icon name={ic} size={17} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Popover>

        {/* title (uncontrolled, committed on blur; remounts when the doc or its title changes) */}
        <input
          key={`${doc.id}:${doc.title}`}
          defaultValue={doc.title}
          onBlur={(e) => commitTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="Untitled doc"
          className="min-w-0 flex-1 bg-transparent text-2xl font-bold tracking-tight text-white placeholder:text-white/25 outline-none"
        />

        {/* saved indicator */}
        <span className="hidden shrink-0 items-center gap-1 text-[11px] text-white/35 md:inline-flex">
          <Icon name="mingcute:check-circle-line" size={13} className="text-emerald-400/80" />
          Saved · {timeAgo(doc.updatedAt)}
        </span>

        {/* space assignment */}
        <Popover
          width={220}
          align="end"
          trigger={
            <button className="glass-soft glass-hover hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-white/80 cursor-pointer sm:flex">
              {space ? (
                <>
                  <Icon name={space.icon} size={13} style={{ color: space.color }} />
                  {space.name}
                </>
              ) : (
                <>
                  <Icon name="mingcute:building-2-line" size={13} className="text-white/50" />
                  Workspace
                </>
              )}
              <Icon name="mingcute:down-line" size={12} className="text-white/40" />
            </button>
          }
        >
          <MenuList>
            <MenuLabel>Move to</MenuLabel>
            <MenuItem
              icon="mingcute:building-2-line"
              label="Workspace"
              active={!doc.spaceId}
              onClick={() => updateDoc(doc.id, { spaceId: null })}
            />
            {spaces
              .filter((sp) => !sp.archived)
              .map((sp) => (
                <MenuItem
                  key={sp.id}
                  icon={sp.icon}
                  color={sp.color}
                  label={sp.name}
                  active={sp.id === doc.spaceId}
                  onClick={() => updateDoc(doc.id, { spaceId: sp.id })}
                />
              ))}
          </MenuList>
        </Popover>

        {/* cover gradient picker */}
        <Popover
          width={228}
          align="end"
          trigger={
            <IconButton size="sm" icon="mingcute:palette-line" label="Cover" className="shrink-0" active={!!doc.coverGradient} />
          }
        >
          {(close) => (
            <div className="p-3">
              <MenuLabel>Cover</MenuLabel>
              <div className="mt-1 grid grid-cols-4 gap-1.5 px-1">
                {gradientPalette.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      updateDoc(doc.id, { coverGradient: g });
                      close();
                    }}
                    className={cn(
                      "h-10 rounded-lg cursor-pointer transition-transform hover:scale-105",
                      g === doc.coverGradient && "ring-2 ring-white/70"
                    )}
                    style={{ background: g }}
                  />
                ))}
                <button
                  onClick={() => {
                    updateDoc(doc.id, { coverGradient: null });
                    close();
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-lg border border-dashed border-white/20 text-[10px] text-white/50 cursor-pointer hover:border-white/40 hover:text-white",
                    !doc.coverGradient && "ring-2 ring-white/40"
                  )}
                >
                  None
                </button>
              </div>
            </div>
          )}
        </Popover>

        <IconButton
          size="sm"
          icon={fav ? "mingcute:star-fill" : "mingcute:star-line"}
          label={fav ? "Unfavorite" : "Favorite"}
          className={cn("shrink-0", fav && "text-amber-300 hover:text-amber-200")}
          onClick={() => toggleFavorite("docs", doc.id)}
        />
        <IconButton
          size="sm"
          icon="mingcute:delete-2-line"
          label="Delete doc"
          className="shrink-0 hover:bg-rose-500/15 hover:text-rose-300"
          onClick={() => setConfirmDelete(true)}
        />
      </div>

      {/* formatting toolbar */}
      {editor && <FormatToolbar editor={editor} />}

      {/* document body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {doc.coverGradient && (
          <div className="relative h-36 w-full shrink-0" style={{ background: doc.coverGradient }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
        )}
        <div
          className="mx-auto w-full max-w-3xl cursor-text px-6 pb-24 pt-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) editor?.commands.focus("end");
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${doc.title}”?`}
        body="This doc will be permanently removed. This cannot be undone."
        onConfirm={() => {
          deleteDoc(doc.id);
          toast("Doc deleted", { body: doc.title, icon: "mingcute:delete-2-line", kind: "info" });
          router.push("/app/docs");
        }}
      />
    </div>
  );
}

export default function DocEditorPage() {
  return (
    <Suspense>
      <DocEditorInner />
    </Suspense>
  );
}
