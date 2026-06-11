"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Comment, ID } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Icon, IconButton } from "@/components/ui/primitives";
import { Popover, Tooltip } from "@/components/ui/overlay";

export const QUICK_EMOJIS = ["👍", "🎉", "❤️", "🚀", "👀", "✅"];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Comment body with @mention highlighting ────────────────────────────────

function CommentBody({ body }: { body: string }) {
  const users = useStore((s) => s.users);
  const parts = useMemo(() => {
    const names = users
      .map((u) => u.name)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!names.length) return [body];
    const re = new RegExp(`(@(?:${names.map(escapeRegExp).join("|")}))`, "g");
    return body.split(re);
  }, [body, users]);

  return (
    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/80">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="rounded bg-indigo-500/15 px-0.5 font-medium text-indigo-300">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}

// ─── Single comment ─────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: Comment }) {
  const users = useStore((s) => s.users);
  const me = useStore((s) => s.currentUserId) ?? "u_ava";
  const toggleReaction = useStore((s) => s.toggleReaction);
  const toggleResolveComment = useStore((s) => s.toggleResolveComment);
  const deleteComment = useStore((s) => s.deleteComment);

  const isAutomation = comment.authorId === "automation";
  const author = users.find((u) => u.id === comment.authorId);

  return (
    <div
      className={cn(
        "group relative -mx-2 rounded-xl px-2 py-2 transition-colors hover:bg-white/4",
        comment.resolved && "opacity-55"
      )}
    >
      <div className="flex items-start gap-2.5">
        {isAutomation ? (
          <span className="accent-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-[0_2px_10px_rgba(99,102,241,0.45)]">
            <Icon name="mingcute:flash-fill" size={14} className="text-white" />
          </span>
        ) : author ? (
          <Avatar user={author} size={28} />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/60">
            ?
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={cn("text-xs font-semibold", isAutomation ? "text-indigo-300" : "text-white/90")}>
              {isAutomation ? "Automation" : author?.name ?? "Someone"}
            </span>
            <span className="text-[10px] text-white/30">{timeAgo(comment.createdAt)}</span>
            {comment.resolved && (
              <Badge color="#34d399" size="sm">
                <Icon name="mingcute:check-line" size={10} />
                Resolved
              </Badge>
            )}
          </div>

          <CommentBody body={comment.body} />

          {comment.reactions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {comment.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => toggleReaction(comment.id, r.emoji)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                    r.userIds.includes(me)
                      ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium tabular-nums">{r.userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* hover actions */}
      <div className="glass-soft absolute -top-1 right-1 flex items-center gap-0.5 rounded-lg p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Popover
          align="end"
          trigger={<IconButton size="xs" icon="mingcute:emoji-line" label="Add reaction" />}
        >
          {(close) => (
            <div className="flex gap-0.5 p-1.5">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    toggleReaction(comment.id, e);
                    close();
                  }}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[15px] transition-colors hover:bg-white/10"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </Popover>
        <Tooltip label={comment.resolved ? "Reopen" : "Resolve"}>
          <IconButton
            size="xs"
            icon={comment.resolved ? "mingcute:refresh-2-line" : "mingcute:check-line"}
            label={comment.resolved ? "Reopen comment" : "Resolve comment"}
            onClick={() => toggleResolveComment(comment.id)}
          />
        </Tooltip>
        {comment.authorId === me && (
          <Tooltip label="Delete">
            <IconButton
              size="xs"
              icon="mingcute:delete-2-line"
              label="Delete comment"
              className="hover:!text-rose-300"
              onClick={() => deleteComment(comment.id)}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ─── Comments list ──────────────────────────────────────────────────────────

export function CommentsSection({ taskId }: { taskId: ID }) {
  const comments = useStore((s) => s.comments);
  const list = useMemo(
    () =>
      comments
        .filter((c) => c.taskId === taskId)
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments, taskId]
  );

  if (!list.length) {
    return (
      <EmptyState
        icon="mingcute:message-2-line"
        title="No comments yet"
        body="Start the conversation below — mention teammates with @ to pull them in."
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-0.5">
      {list.map((c) => (
        <CommentItem key={c.id} comment={c} />
      ))}
    </div>
  );
}

// ─── Composer with @mentions ────────────────────────────────────────────────

interface MentionCtx {
  query: string;
  start: number; // index of the "@" in the value
}

export function CommentComposer({ taskId }: { taskId: ID }) {
  const users = useStore((s) => s.users);
  const addComment = useStore((s) => s.addComment);

  const [value, setValue] = useState("");
  const [mention, setMention] = useState<MentionCtx | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // auto-resize
  useEffect(() => {
    const el = taRef.current;
    if (el) {
      el.style.height = "0px";
      el.style.height = `${Math.min(160, el.scrollHeight)}px`;
    }
  }, [value]);

  const filtered = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 6);
  }, [users, mention]);

  const act = Math.min(activeIdx, Math.max(0, filtered.length - 1));

  const refreshMention = (val: string, caret: number) => {
    const before = val.slice(0, caret);
    const m = /(^|[\s(])@([A-Za-z]{0,24})$/.exec(before);
    if (m) {
      const next: MentionCtx = { query: m[2], start: caret - m[2].length - 1 };
      if (next.query !== mention?.query) setActiveIdx(0);
      setMention(next);
    } else {
      setMention(null);
    }
  };

  const insertMention = (name: string) => {
    if (!mention) return;
    const el = taRef.current;
    const caret = el?.selectionStart ?? value.length;
    const next = `${value.slice(0, mention.start)}@${name} ${value.slice(caret)}`;
    const pos = mention.start + name.length + 2;
    setValue(next);
    setMention(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const insertAtCaret = (text: string) => {
    const el = taRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    const pos = start + text.length;
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
      refreshMention(next, pos);
    });
  };

  const submit = () => {
    const body = value.trim();
    if (!body) return;
    addComment(taskId, body);
    setValue("");
    setMention(null);
    taRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && filtered.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey)) {
        e.preventDefault();
        insertMention(filtered[act].name);
        return;
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative">
      {/* mention suggestions */}
      {mention && filtered.length > 0 && (
        <div className="glass-strong absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl p-1.5 shadow-2xl">
          <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Mention someone
          </div>
          {filtered.map((u, i) => (
            <button
              key={u.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(u.name)}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                i === act ? "bg-indigo-500/20" : "hover:bg-white/8"
              )}
            >
              <Avatar user={u} size={22} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-white/90">{u.name}</span>
                <span className="block truncate text-[10px] text-white/35">{u.title}</span>
              </span>
              {i === act && <Icon name="mingcute:corner-down-left-line" size={12} className="text-white/30" />}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/4 transition-colors focus-within:border-indigo-400/45 focus-within:bg-white/6">
        <textarea
          ref={taRef}
          value={value}
          rows={1}
          onChange={(e) => {
            setValue(e.target.value);
            refreshMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onKeyDown={onKeyDown}
          placeholder="Write a comment… use @ to mention"
          className="w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[13px] text-white/90 placeholder:text-white/30 focus:outline-none"
        />
        <div className="flex items-center gap-0.5 px-2 pb-2">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => insertAtCaret(e)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[13px] transition-colors hover:bg-white/10"
              aria-label={`Insert ${e}`}
            >
              {e}
            </button>
          ))}
          <IconButton size="xs" icon="mingcute:at-line" label="Mention someone" onClick={() => insertAtCaret("@")} />
          <span className="flex-1" />
          <span className="mr-1.5 hidden text-[10px] text-white/25 sm:block">⌘↵ to send</span>
          <Button size="xs" variant="primary" icon="mingcute:send-plane-line" disabled={!value.trim()} onClick={submit}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
