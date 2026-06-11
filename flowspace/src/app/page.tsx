"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, Icon } from "@/components/ui/primitives";

const features = [
  { icon: "mingcute:kanban-line", title: "Every view you need", body: "List, Board, Table, Calendar, Gantt and Workload — switch instantly, filters follow you." },
  { icon: "mingcute:lightning-line", title: "Automations", body: "No-code rules that assign, move, tag and notify so your team never does robot work." },
  { icon: "mingcute:document-2-line", title: "Docs & Goals", body: "Connected docs and measurable goals live next to the work, not in another tab." },
  { icon: "mingcute:chart-line-line", title: "Dashboards", body: "Real-time widgets for status, workload, time and trends across every project." },
];

export default function LandingPage() {
  const router = useRouter();
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const hydrated = useStore((s) => s.hydrated);
  const login = useStore((s) => s.login);
  const workspace = useStore((s) => s.workspace);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (hydrated && currentUserId) router.replace("/app/home");
  }, [hydrated, currentUserId, router]);

  const enter = (userId: string) => {
    login(userId);
    router.push("/app/home");
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center px-6 overflow-hidden">
      {/* floating glass orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[12%] left-[8%] h-40 w-40 rounded-full bg-indigo-500/14 blur-3xl animate-float-slow" />
        <div className="absolute top-[30%] right-[10%] h-56 w-56 rounded-full bg-purple-500/12 blur-3xl animate-float-slow" style={{ animationDelay: "-3s" }} />
        <div className="absolute bottom-[12%] left-[28%] h-48 w-48 rounded-full bg-sky-500/12 blur-3xl animate-float-slow" style={{ animationDelay: "-5s" }} />
      </div>

      {/* nav */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="glass mt-6 flex w-full max-w-5xl items-center justify-between rounded-2xl px-5 py-3"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl accent-gradient shadow-[0_4px_18px_rgba(99,102,241,0.5)]">
            <Icon name="mingcute:wave-line" size={18} className="text-white" />
          </span>
          <span className="text-[17px] font-bold tracking-tight">Flowspace</span>
        </div>
        <button
          onClick={() => setSelecting(true)}
          className="accent-gradient h-9 rounded-xl px-4 text-sm font-medium text-white shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:brightness-110 transition-all cursor-pointer"
        >
          Sign in
        </button>
      </motion.nav>

      {/* hero */}
      <section className="flex flex-1 flex-col items-center justify-center text-center max-w-3xl py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.05 }}
          className="glass-soft mb-6 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-white/70"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          The everything work OS — projects, docs, goals & automations
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.12 }}
          className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]"
        >
          Your work, finally
          <br />
          <span className="gradient-text">in flow.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.2 }}
          className="mt-6 max-w-xl text-base text-white/55 leading-relaxed"
        >
          One beautiful home for every plan, task, doc and dashboard. Built for teams that move fast and hate busywork.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.28 }}
          className="mt-9 flex items-center gap-3"
        >
          <button
            onClick={() => setSelecting(true)}
            className="accent-gradient sheen h-12 rounded-2xl px-7 text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(99,102,241,0.45)] hover:brightness-110 transition-all cursor-pointer"
          >
            Open the demo workspace
          </button>
        </motion.div>

        {/* features */}
        <div className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-2 w-full">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 170, damping: 24, delay: 0.36 + i * 0.07 }}
              className="glass-card glass-hover sheen p-5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 mb-3">
                <Icon name={f.icon} size={19} className="text-indigo-300" />
              </span>
              <h3 className="text-sm font-semibold text-white/95">{f.title}</h3>
              <p className="mt-1 text-xs text-white/50 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* user picker overlay */}
      {selecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelecting(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-strong w-full max-w-md rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient">
                <Icon name="mingcute:wave-line" size={18} className="text-white" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold">Sign in to {workspace.name}</h2>
                <p className="text-xs text-white/45">Pick a teammate to explore the demo as</p>
              </div>
            </div>
            <div className="mt-4 max-h-[340px] space-y-1 overflow-y-auto pr-1">
              {users.map((u, i) => (
                <motion.button
                  key={u.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 26 }}
                  onClick={() => enter(u.id)}
                  className="glass-soft glass-hover flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left cursor-pointer"
                >
                  <Avatar user={u} size={34} showOnline />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-white/95 truncate">{u.name}</span>
                    <span className="block text-[11px] text-white/45 truncate">
                      {u.title} · {u.role}
                    </span>
                  </span>
                  <Icon name="mingcute:arrow-right-line" size={16} className="text-white/30" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      <footer className="pb-6 text-[11px] text-white/30">Flowspace — a full-featured work management platform demo.</footer>
    </main>
  );
}
