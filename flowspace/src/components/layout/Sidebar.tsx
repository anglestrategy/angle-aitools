"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/uiStore";
import { cn } from "@/lib/utils";
import { Avatar, Icon } from "@/components/ui/primitives";
import { MenuItem, MenuList, MenuSeparator, Popover } from "@/components/ui/overlay";

function NavLink({
  href,
  icon,
  label,
  badge,
  collapsed,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-[10px] px-2.5 h-8 text-[13px] font-medium transition-colors duration-150",
        collapsed && "justify-center px-0",
        active ? "text-white" : "text-white/55 hover:text-white hover:bg-white/6"
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-[10px] bg-gradient-to-r from-indigo-500/22 to-purple-500/14 border border-indigo-400/25"
        />
      )}
      <Icon name={icon} size={16} className={cn("relative shrink-0", active ? "text-indigo-300" : "")} />
      {!collapsed && <span className="relative flex-1 truncate">{label}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span className="relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full accent-gradient px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {collapsed && badge != null && badge > 0 && (
        <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-indigo-400" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const openNewProject = useUI((s) => s.openNewProject);
  const setNewSpaceModal = useUI((s) => s.setNewSpaceModal);

  const workspace = useStore((s) => s.workspace);
  const spaces = useStore((s) => s.spaces);
  const projects = useStore((s) => s.projects);
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const notifications = useStore((s) => s.notifications);
  const favorites = useStore((s) => s.favorites);
  const tasks = useStore((s) => s.tasks);
  const logout = useStore((s) => s.logout);

  const me = users.find((u) => u.id === currentUserId);
  const unread = notifications.filter((n) => n.userId === currentUserId && !n.read).length;
  const myOpenTasks = tasks.filter((t) => currentUserId && t.assigneeIds.includes(currentUserId) && !t.completedAt && !t.archived).length;

  const [openSpaces, setOpenSpaces] = useState<string[]>(spaces.map((s) => s.id));
  const toggleSpace = (id: string) => setOpenSpaces((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const favProjects = projects.filter((p) => favorites.projects.includes(p.id));

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 248 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="glass relative z-30 m-3 mr-0 flex shrink-0 flex-col rounded-2xl overflow-hidden"
    >
      {/* workspace header */}
      <div className={cn("flex items-center gap-2.5 px-3 pt-3 pb-2", collapsed && "justify-center px-0")}>
        <Popover
          width={220}
          trigger={
            <button className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-white/6 transition-colors cursor-pointer min-w-0">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_4px_14px_rgba(99,102,241,0.45)]"
                style={{ background: `linear-gradient(135deg, ${workspace.color}, #a855f7)` }}
              >
                {workspace.name[0]}
              </span>
              {!collapsed && (
                <span className="min-w-0 text-left">
                  <span className="block truncate text-[13px] font-semibold text-white/95">{workspace.name}</span>
                  <span className="block text-[10px] text-white/40 capitalize">{workspace.plan} plan</span>
                </span>
              )}
              {!collapsed && <Icon name="mingcute:down-line" size={14} className="text-white/35 shrink-0" />}
            </button>
          }
        >
          <MenuList>
            <MenuItem icon="mingcute:settings-3-line" label="Workspace settings" onClick={() => router.push("/app/settings")} />
            <MenuItem icon="mingcute:group-line" label="Members" onClick={() => router.push("/app/settings/members")} />
            <MenuItem icon="mingcute:plugin-2-line" label="Integrations" onClick={() => router.push("/app/integrations")} />
            <MenuSeparator />
            <MenuItem
              icon="mingcute:exit-line"
              label="Sign out"
              onClick={() => {
                logout();
                router.push("/");
              }}
            />
          </MenuList>
        </Popover>
      </div>

      {/* main nav */}
      <div className={cn("flex flex-col gap-0.5 px-2.5 pt-1", collapsed && "items-stretch")}>
        <NavLink href="/app/home" icon="mingcute:home-4-line" label="Home" collapsed={collapsed} />
        <NavLink href="/app/my-tasks" icon="mingcute:checkbox-line" label="My Tasks" badge={myOpenTasks} collapsed={collapsed} />
        <NavLink href="/app/inbox" icon="mingcute:inbox-line" label="Inbox" badge={unread} collapsed={collapsed} />
        <NavLink href="/app/docs" icon="mingcute:document-2-line" label="Docs" collapsed={collapsed} />
        <NavLink href="/app/goals" icon="mingcute:target-line" label="Goals" collapsed={collapsed} />
        <NavLink href="/app/dashboards" icon="mingcute:chart-pie-2-line" label="Dashboards" collapsed={collapsed} />
        <NavLink href="/app/timesheet" icon="mingcute:time-line" label="Timesheet" collapsed={collapsed} />
        <NavLink href="/app/automations" icon="mingcute:lightning-line" label="Automations" collapsed={collapsed} />
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-2.5 pb-2">
        {/* favorites */}
        {!collapsed && favProjects.length > 0 && (
          <>
            <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Favorites</div>
            {favProjects.map((p) => (
              <Link
                key={p.id}
                href={`/app/projects/${p.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 h-7 text-xs transition-colors",
                  pathname.startsWith(`/app/projects/${p.id}`) ? "bg-white/8 text-white" : "text-white/55 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon name="mingcute:star-fill" size={12} className="text-amber-300/90 shrink-0" />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </>
        )}

        {/* spaces */}
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pb-1 pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Spaces</span>
            <button
              onClick={() => setNewSpaceModal(true)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-white/35 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
              title="New space"
            >
              <Icon name="mingcute:add-line" size={13} />
            </button>
          </div>
        )}
        {collapsed && <div className="mx-auto my-2 h-px w-6 bg-white/10" />}

        {spaces
          .filter((s) => !s.archived)
          .sort((a, b) => a.order - b.order)
          .map((space) => {
            const spaceProjects = projects.filter((p) => p.spaceId === space.id && !p.archived).sort((a, b) => a.order - b.order);
            const open = openSpaces.includes(space.id);
            if (collapsed) {
              return (
                <Link
                  key={space.id}
                  href={`/app/spaces/${space.id}`}
                  title={space.name}
                  className="my-1 flex h-9 items-center justify-center rounded-xl hover:bg-white/6 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${space.color}25` }}>
                    <Icon name={space.icon} size={15} style={{ color: space.color }} />
                  </span>
                </Link>
              );
            }
            return (
              <div key={space.id} className="mb-0.5">
                <div className="group flex items-center gap-1.5 rounded-lg px-1.5 h-8 hover:bg-white/5 transition-colors">
                  <button
                    onClick={() => toggleSpace(space.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-white/35 hover:text-white cursor-pointer"
                  >
                    <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex">
                      <Icon name="mingcute:right-line" size={13} />
                    </motion.span>
                  </button>
                  <Link href={`/app/spaces/${space.id}`} className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
                    <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${space.color}25` }}>
                      <Icon name={space.icon} size={13} style={{ color: space.color }} />
                    </span>
                    <span className="truncate text-[13px] font-medium text-white/75 group-hover:text-white">{space.name}</span>
                    {space.private && <Icon name="mingcute:lock-line" size={11} className="text-white/30 shrink-0" />}
                  </Link>
                  <button
                    onClick={() => openNewProject(space.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-white/0 group-hover:text-white/45 hover:!text-white cursor-pointer transition-colors"
                    title="New project"
                  >
                    <Icon name="mingcute:add-line" size={13} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 36 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-[18px] border-l border-white/8 pl-2 py-0.5">
                        {spaceProjects.map((p) => {
                          const active = pathname.startsWith(`/app/projects/${p.id}`);
                          return (
                            <Link
                              key={p.id}
                              href={`/app/projects/${p.id}`}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2 h-7 text-xs transition-colors",
                                active ? "bg-white/8 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <Icon name={p.icon} size={13} style={{ color: p.color }} className="shrink-0" />
                              <span className="truncate">{p.name}</span>
                            </Link>
                          );
                        })}
                        {!spaceProjects.length && <div className="px-2 py-1 text-[11px] text-white/25 italic">No projects</div>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </div>

      {/* footer: user + collapse */}
      <div className={cn("border-t border-white/8 p-2.5 flex items-center gap-2", collapsed && "flex-col")}>
        {me && (
          <Popover
            width={210}
            side="top"
            trigger={
              <button className={cn("flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-white/6 transition-colors cursor-pointer min-w-0", !collapsed && "flex-1")}>
                <Avatar user={me} size={30} showOnline />
                {!collapsed && (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-xs font-medium text-white/90">{me.name}</span>
                    <span className="block truncate text-[10px] text-white/40">{me.title}</span>
                  </span>
                )}
              </button>
            }
          >
            <MenuList>
              <MenuItem icon="mingcute:user-3-line" label="Profile & settings" onClick={() => router.push("/app/settings/profile")} />
              <MenuItem icon="mingcute:moon-line" label="Theme: Glass Dark" hint="locked" />
              <MenuSeparator />
              <MenuItem
                icon="mingcute:exit-line"
                label="Sign out"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              />
            </MenuList>
          </Popover>
        )}
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "mingcute:layout-right-line" : "mingcute:layout-left-line"} size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
