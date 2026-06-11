import { addDays, format, subDays, subHours, subMinutes } from "date-fns";
import type {
  Activity,
  AppNotification,
  Automation,
  Comment,
  CustomFieldDef,
  Dashboard,
  Doc,
  Goal,
  Integration,
  Project,
  Space,
  Status,
  Tag,
  Task,
  TimeEntry,
  User,
  Workspace,
} from "./types";
import { uid } from "./utils";

const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const ago = (hours: number) => subHours(new Date(), hours).toISOString();
const minsAgo = (m: number) => subMinutes(new Date(), m).toISOString();
const daysAgo = (d: number) => subDays(new Date(), d).toISOString();

// ─── Users ──────────────────────────────────────────────────────────────────

export const seedUsers: User[] = [
  { id: "u_ava", name: "Ava Chen", email: "ava@flowspace.dev", initials: "AC", color: "#6366f1", role: "owner", title: "Head of Product", online: true, capacityHours: 40 },
  { id: "u_marcus", name: "Marcus Webb", email: "marcus@flowspace.dev", initials: "MW", color: "#0ea5e9", role: "admin", title: "Engineering Lead", online: true, capacityHours: 40 },
  { id: "u_sofia", name: "Sofia Reyes", email: "sofia@flowspace.dev", initials: "SR", color: "#ec4899", role: "member", title: "Senior Designer", online: true, capacityHours: 40 },
  { id: "u_liam", name: "Liam O'Connor", email: "liam@flowspace.dev", initials: "LO", color: "#10b981", role: "member", title: "Full-stack Engineer", online: false, capacityHours: 40 },
  { id: "u_yuki", name: "Yuki Tanaka", email: "yuki@flowspace.dev", initials: "YT", color: "#f59e0b", role: "member", title: "Frontend Engineer", online: true, capacityHours: 32 },
  { id: "u_zara", name: "Zara Ahmed", email: "zara@flowspace.dev", initials: "ZA", color: "#a855f7", role: "member", title: "Growth Marketer", online: false, capacityHours: 40 },
  { id: "u_diego", name: "Diego Santos", email: "diego@flowspace.dev", initials: "DS", color: "#14b8a6", role: "member", title: "QA Engineer", online: true, capacityHours: 40 },
  { id: "u_emma", name: "Emma Larsson", email: "emma@flowspace.dev", initials: "EL", color: "#f43f5e", role: "guest", title: "Client — Northwind Co.", online: false, capacityHours: 10 },
];

export const seedWorkspace: Workspace = {
  id: "ws_main",
  name: "Acme Studio",
  plan: "business",
  color: "#6366f1",
  createdAt: daysAgo(220),
};

// ─── Tags ───────────────────────────────────────────────────────────────────

export const seedTags: Tag[] = [
  { id: "tag_frontend", name: "frontend", color: "#0ea5e9" },
  { id: "tag_backend", name: "backend", color: "#10b981" },
  { id: "tag_design", name: "design", color: "#ec4899" },
  { id: "tag_bug", name: "bug", color: "#f43f5e" },
  { id: "tag_research", name: "research", color: "#a855f7" },
  { id: "tag_marketing", name: "marketing", color: "#f59e0b" },
  { id: "tag_mobile", name: "mobile", color: "#14b8a6" },
  { id: "tag_infra", name: "infra", color: "#64748b" },
  { id: "tag_customer", name: "customer-request", color: "#fb923c" },
  { id: "tag_a11y", name: "accessibility", color: "#84cc16" },
];

// ─── Spaces ─────────────────────────────────────────────────────────────────

export const seedSpaces: Space[] = [
  { id: "sp_product", name: "Product", icon: "mingcute:box-3-line", color: "#6366f1", description: "Core product development — roadmap, sprints and releases.", memberIds: ["u_ava", "u_marcus", "u_sofia", "u_liam", "u_yuki", "u_diego"], private: false, archived: false, order: 0 },
  { id: "sp_design", name: "Design", icon: "mingcute:palette-line", color: "#ec4899", description: "Design system, brand and product design work.", memberIds: ["u_sofia", "u_ava", "u_yuki"], private: false, archived: false, order: 1 },
  { id: "sp_marketing", name: "Marketing", icon: "mingcute:rocket-line", color: "#f59e0b", description: "Campaigns, content and growth experiments.", memberIds: ["u_zara", "u_ava", "u_emma"], private: false, archived: false, order: 2 },
  { id: "sp_ops", name: "Operations", icon: "mingcute:settings-3-line", color: "#10b981", description: "People ops, finance and internal tooling.", memberIds: ["u_ava", "u_marcus"], private: true, archived: false, order: 3 },
];

// ─── Statuses / fields factories ────────────────────────────────────────────

const devStatuses = (): Status[] => [
  { id: "st_backlog", name: "Backlog", color: "#64748b", kind: "open", order: 0 },
  { id: "st_todo", name: "To Do", color: "#94a3b8", kind: "open", order: 1 },
  { id: "st_progress", name: "In Progress", color: "#38bdf8", kind: "active", order: 2 },
  { id: "st_review", name: "In Review", color: "#a855f7", kind: "active", order: 3 },
  { id: "st_done", name: "Done", color: "#34d399", kind: "done", order: 4 },
];

const simpleStatuses = (): Status[] => [
  { id: "st_todo", name: "To Do", color: "#94a3b8", kind: "open", order: 0 },
  { id: "st_progress", name: "In Progress", color: "#38bdf8", kind: "active", order: 1 },
  { id: "st_done", name: "Done", color: "#34d399", kind: "done", order: 2 },
];

const campaignStatuses = (): Status[] => [
  { id: "st_idea", name: "Idea", color: "#94a3b8", kind: "open", order: 0 },
  { id: "st_drafting", name: "Drafting", color: "#fbbf24", kind: "active", order: 1 },
  { id: "st_review", name: "In Review", color: "#a855f7", kind: "active", order: 2 },
  { id: "st_scheduled", name: "Scheduled", color: "#38bdf8", kind: "active", order: 3 },
  { id: "st_live", name: "Live", color: "#34d399", kind: "done", order: 4 },
];

const sprintFields: CustomFieldDef[] = [
  { id: "cf_sprint", name: "Sprint", type: "select", icon: "mingcute:run-line", options: [
    { id: "opt_s23", label: "Sprint 23", color: "#64748b" },
    { id: "opt_s24", label: "Sprint 24", color: "#38bdf8" },
    { id: "opt_s25", label: "Sprint 25", color: "#a855f7" },
  ]},
  { id: "cf_effort", name: "Effort", type: "rating", icon: "mingcute:star-line" },
  { id: "cf_release", name: "Release", type: "select", icon: "mingcute:tag-line", options: [
    { id: "opt_r31", label: "v3.1", color: "#34d399" },
    { id: "opt_r32", label: "v3.2", color: "#38bdf8" },
    { id: "opt_r40", label: "v4.0", color: "#f59e0b" },
  ]},
];

const campaignFields: CustomFieldDef[] = [
  { id: "cf_channel", name: "Channel", type: "multiselect", icon: "mingcute:share-2-line", options: [
    { id: "opt_email", label: "Email", color: "#38bdf8" },
    { id: "opt_social", label: "Social", color: "#ec4899" },
    { id: "opt_blog", label: "Blog", color: "#34d399" },
    { id: "opt_paid", label: "Paid Ads", color: "#f59e0b" },
  ]},
  { id: "cf_budget", name: "Budget", type: "currency", icon: "mingcute:currency-dollar-line" },
  { id: "cf_audience", name: "Audience", type: "text", icon: "mingcute:group-line" },
];

// ─── Projects ───────────────────────────────────────────────────────────────

export const seedProjects: Project[] = [
  { id: "pr_app", spaceId: "sp_product", name: "Mobile App v4", icon: "mingcute:cellphone-line", color: "#6366f1", description: "Ship the v4 redesign of the mobile app with offline mode and the new home feed.", statuses: devStatuses(), customFields: sprintFields, views: ["overview", "list", "board", "table", "calendar", "gantt", "workload", "activity"], defaultView: "board", memberIds: ["u_marcus", "u_liam", "u_yuki", "u_sofia", "u_diego"], archived: false, order: 0, createdAt: daysAgo(90), startDate: day(-45), targetDate: day(40) },
  { id: "pr_platform", spaceId: "sp_product", name: "Platform Core", icon: "mingcute:server-line", color: "#0ea5e9", description: "Backend platform: API, auth, billing and infrastructure.", statuses: devStatuses(), customFields: sprintFields, views: ["overview", "list", "board", "table", "calendar", "gantt", "workload", "activity"], defaultView: "list", memberIds: ["u_marcus", "u_liam", "u_diego"], archived: false, order: 1, createdAt: daysAgo(180), startDate: day(-60), targetDate: day(60) },
  { id: "pr_bugs", spaceId: "sp_product", name: "Bug Tracker", icon: "mingcute:bug-line", color: "#f43f5e", description: "Triage and squash. All inbound bugs land here.", statuses: simpleStatuses(), customFields: [{ id: "cf_severity", name: "Severity", type: "select", icon: "mingcute:alert-line", options: [ { id: "opt_sev1", label: "Sev 1", color: "#f43f5e" }, { id: "opt_sev2", label: "Sev 2", color: "#f59e0b" }, { id: "opt_sev3", label: "Sev 3", color: "#94a3b8" } ] }], views: ["list", "board", "table", "activity"], defaultView: "list", memberIds: ["u_diego", "u_liam", "u_yuki", "u_marcus"], archived: false, order: 2, createdAt: daysAgo(160), startDate: null, targetDate: null },
  { id: "pr_dsys", spaceId: "sp_design", name: "Design System 2.0", icon: "mingcute:layout-grid-line", color: "#ec4899", description: "Tokens, components and docs for the Glass design language.", statuses: simpleStatuses(), customFields: [], views: ["overview", "list", "board", "table", "calendar", "activity"], defaultView: "board", memberIds: ["u_sofia", "u_yuki", "u_ava"], archived: false, order: 0, createdAt: daysAgo(70), startDate: day(-30), targetDate: day(30) },
  { id: "pr_website", spaceId: "sp_design", name: "Website Refresh", icon: "mingcute:earth-line", color: "#a855f7", description: "New marketing site: landing, pricing, and customer stories.", statuses: simpleStatuses(), customFields: [], views: ["list", "board", "calendar", "gantt", "activity"], defaultView: "list", memberIds: ["u_sofia", "u_zara", "u_emma"], archived: false, order: 1, createdAt: daysAgo(40), startDate: day(-20), targetDate: day(25) },
  { id: "pr_q3", spaceId: "sp_marketing", name: "Q3 Launch Campaign", icon: "mingcute:announcement-line", color: "#f59e0b", description: "Integrated launch campaign for v4 across email, social and paid.", statuses: campaignStatuses(), customFields: campaignFields, views: ["overview", "list", "board", "table", "calendar", "activity"], defaultView: "board", memberIds: ["u_zara", "u_ava", "u_emma", "u_sofia"], archived: false, order: 0, createdAt: daysAgo(35), startDate: day(-15), targetDate: day(35) },
  { id: "pr_content", spaceId: "sp_marketing", name: "Content Pipeline", icon: "mingcute:quill-pen-line", color: "#84cc16", description: "Evergreen content: blog, SEO and newsletter.", statuses: campaignStatuses(), customFields: campaignFields, views: ["list", "board", "calendar", "activity"], defaultView: "list", memberIds: ["u_zara", "u_emma"], archived: false, order: 1, createdAt: daysAgo(120), startDate: null, targetDate: null },
  { id: "pr_onboard", spaceId: "sp_ops", name: "Team Onboarding", icon: "mingcute:user-add-2-line", color: "#10b981", description: "Hiring pipeline and new-hire onboarding checklists.", statuses: simpleStatuses(), customFields: [], views: ["list", "board", "calendar", "activity"], defaultView: "list", memberIds: ["u_ava", "u_marcus"], archived: false, order: 0, createdAt: daysAgo(200), startDate: null, targetDate: null },
];

// ─── Tasks ──────────────────────────────────────────────────────────────────

interface TaskSeed {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  statusId: string;
  priority?: Task["priority"];
  assigneeIds?: string[];
  tagIds?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  estimateHours?: number;
  storyPoints?: number;
  customFieldValues?: Record<string, unknown>;
  checklist?: { text: string; done: boolean }[];
  completedDaysAgo?: number;
  coverGradient?: string;
  createdDaysAgo?: number;
}

const T = (s: TaskSeed, order: number): Task => ({
  id: s.id,
  projectId: s.projectId,
  parentId: s.parentId ?? null,
  title: s.title,
  description: s.description ?? "",
  statusId: s.statusId,
  priority: s.priority ?? "none",
  assigneeIds: s.assigneeIds ?? [],
  watcherIds: s.assigneeIds ?? [],
  tagIds: s.tagIds ?? [],
  startDate: s.startDate ?? null,
  dueDate: s.dueDate ?? null,
  estimateHours: s.estimateHours ?? null,
  storyPoints: s.storyPoints ?? null,
  customFieldValues: s.customFieldValues ?? {},
  checklist: (s.checklist ?? []).map((c) => ({ id: uid("cl"), ...c })),
  attachments: [],
  order,
  createdAt: daysAgo(s.createdDaysAgo ?? 14),
  updatedAt: ago(Math.floor(Math.random() * 96) + 1),
  createdBy: s.assigneeIds?.[0] ?? "u_ava",
  completedAt: s.completedDaysAgo != null ? daysAgo(s.completedDaysAgo) : null,
  coverGradient: s.coverGradient ?? null,
  archived: false,
});

const taskSeeds: TaskSeed[] = [
  // ── Mobile App v4 ──
  { id: "t_feed", projectId: "pr_app", title: "Build new home feed with personalized ranking", description: "<p>The home feed is the centerpiece of v4. It should rank items by recency, relevance and user affinity.</p><ul><li>Card-based layout with pull-to-refresh</li><li>Skeleton loading states</li><li>Infinite scroll with cursor pagination</li></ul>", statusId: "st_progress", priority: "urgent", assigneeIds: ["u_yuki", "u_liam"], tagIds: ["tag_frontend", "tag_mobile"], startDate: day(-8), dueDate: day(4), estimateHours: 32, storyPoints: 8, customFieldValues: { cf_sprint: "opt_s24", cf_effort: 4, cf_release: "opt_r40" }, checklist: [{ text: "Feed ranking API contract agreed", done: true }, { text: "Card components built", done: true }, { text: "Pagination wired", done: false }, { text: "Empty & error states", done: false }], coverGradient: "linear-gradient(135deg,#6366f1,#a855f7)", createdDaysAgo: 21 },
  { id: "t_feed_sk", projectId: "pr_app", parentId: "t_feed", title: "Skeleton loading shimmer for feed cards", statusId: "st_done", priority: "normal", assigneeIds: ["u_yuki"], tagIds: ["tag_frontend"], dueDate: day(-2), estimateHours: 4, completedDaysAgo: 2, createdDaysAgo: 10 },
  { id: "t_feed_rank", projectId: "pr_app", parentId: "t_feed", title: "Ranking service: affinity score endpoint", statusId: "st_progress", priority: "high", assigneeIds: ["u_liam"], tagIds: ["tag_backend"], dueDate: day(2), estimateHours: 12, createdDaysAgo: 10 },
  { id: "t_feed_ab", projectId: "pr_app", parentId: "t_feed", title: "A/B experiment flag for ranked vs chronological", statusId: "st_todo", priority: "normal", assigneeIds: ["u_liam"], tagIds: ["tag_backend"], dueDate: day(6), estimateHours: 6, createdDaysAgo: 8 },
  { id: "t_offline", projectId: "pr_app", title: "Offline mode: local cache & sync engine", description: "<p>Queue mutations locally when offline, replay on reconnect with conflict resolution (last-write-wins for fields, merge for lists).</p>", statusId: "st_progress", priority: "high", assigneeIds: ["u_marcus"], tagIds: ["tag_mobile", "tag_backend"], startDate: day(-12), dueDate: day(8), estimateHours: 48, storyPoints: 13, customFieldValues: { cf_sprint: "opt_s24", cf_effort: 5, cf_release: "opt_r40" }, checklist: [{ text: "Storage layer (SQLite)", done: true }, { text: "Mutation queue", done: true }, { text: "Conflict resolution", done: false }, { text: "Sync status UI", done: false }], createdDaysAgo: 30 },
  { id: "t_push", projectId: "pr_app", title: "Rich push notifications with action buttons", statusId: "st_review", priority: "normal", assigneeIds: ["u_liam"], tagIds: ["tag_mobile"], dueDate: day(1), estimateHours: 10, storyPoints: 5, customFieldValues: { cf_sprint: "opt_s24", cf_release: "opt_r40" }, createdDaysAgo: 16 },
  { id: "t_onbflow", projectId: "pr_app", title: "Redesign onboarding flow (3 steps max)", description: "<p>Current onboarding has 7 steps and 38% drop-off. Target: 3 steps, &lt;15% drop-off.</p>", statusId: "st_review", priority: "high", assigneeIds: ["u_sofia", "u_yuki"], tagIds: ["tag_design", "tag_mobile"], startDate: day(-6), dueDate: day(3), estimateHours: 20, storyPoints: 8, customFieldValues: { cf_sprint: "opt_s24", cf_effort: 3, cf_release: "opt_r40" }, coverGradient: "linear-gradient(135deg,#0ea5e9,#6366f1)", createdDaysAgo: 18 },
  { id: "t_darkmode", projectId: "pr_app", title: "Dark mode theme support", statusId: "st_done", priority: "normal", assigneeIds: ["u_yuki"], tagIds: ["tag_frontend", "tag_mobile"], dueDate: day(-5), estimateHours: 16, storyPoints: 5, customFieldValues: { cf_sprint: "opt_s23", cf_release: "opt_r31" }, completedDaysAgo: 5, createdDaysAgo: 25 },
  { id: "t_widgets", projectId: "pr_app", title: "Home screen widgets (iOS & Android)", statusId: "st_backlog", priority: "low", assigneeIds: [], tagIds: ["tag_mobile"], dueDate: day(30), estimateHours: 24, storyPoints: 8, customFieldValues: { cf_sprint: "opt_s25", cf_release: "opt_r40" }, createdDaysAgo: 12 },
  { id: "t_biometric", projectId: "pr_app", title: "Biometric login (FaceID / fingerprint)", statusId: "st_todo", priority: "normal", assigneeIds: ["u_liam"], tagIds: ["tag_mobile"], dueDate: day(12), estimateHours: 12, storyPoints: 5, customFieldValues: { cf_sprint: "opt_s25", cf_release: "opt_r40" }, createdDaysAgo: 9 },
  { id: "t_deeplink", projectId: "pr_app", title: "Universal deep links for shared tasks", statusId: "st_todo", priority: "normal", assigneeIds: ["u_marcus"], tagIds: ["tag_mobile", "tag_backend"], dueDate: day(15), estimateHours: 8, storyPoints: 3, customFieldValues: { cf_sprint: "opt_s25" }, createdDaysAgo: 7 },
  { id: "t_perf", projectId: "pr_app", title: "Cold start under 1.5s on mid-range devices", statusId: "st_backlog", priority: "high", assigneeIds: ["u_yuki"], tagIds: ["tag_mobile", "tag_infra"], dueDate: day(25), estimateHours: 20, storyPoints: 8, customFieldValues: { cf_sprint: "opt_s25", cf_release: "opt_r40" }, createdDaysAgo: 6 },
  { id: "t_appstore", projectId: "pr_app", title: "App Store screenshots & release notes for v4", statusId: "st_backlog", priority: "normal", assigneeIds: ["u_sofia", "u_zara"], tagIds: ["tag_design", "tag_marketing"], dueDate: day(35), estimateHours: 6, createdDaysAgo: 5 },
  { id: "t_haptics", projectId: "pr_app", title: "Haptic feedback polish pass", statusId: "st_done", priority: "low", assigneeIds: ["u_yuki"], tagIds: ["tag_mobile"], dueDate: day(-8), estimateHours: 4, completedDaysAgo: 8, createdDaysAgo: 20 },

  // ── Platform Core ──
  { id: "t_billing", projectId: "pr_platform", title: "Usage-based billing with Stripe metered prices", description: "<p>Move from seat-based to hybrid seat + usage billing. Meter API calls and automation runs.</p>", statusId: "st_progress", priority: "urgent", assigneeIds: ["u_marcus"], tagIds: ["tag_backend"], startDate: day(-10), dueDate: day(5), estimateHours: 40, storyPoints: 13, customFieldValues: { cf_sprint: "opt_s24", cf_effort: 5, cf_release: "opt_r32" }, checklist: [{ text: "Stripe meters configured", done: true }, { text: "Usage aggregation job", done: false }, { text: "Invoice preview endpoint", done: false }], createdDaysAgo: 26 },
  { id: "t_sso", projectId: "pr_platform", title: "SAML SSO for enterprise plan", statusId: "st_review", priority: "high", assigneeIds: ["u_liam"], tagIds: ["tag_backend"], dueDate: day(2), estimateHours: 24, storyPoints: 8, customFieldValues: { cf_sprint: "opt_s24", cf_release: "opt_r32" }, createdDaysAgo: 22 },
  { id: "t_ratelimit", projectId: "pr_platform", title: "Public API rate limiting & API keys", statusId: "st_done", priority: "high", assigneeIds: ["u_marcus"], tagIds: ["tag_backend", "tag_infra"], dueDate: day(-3), estimateHours: 16, storyPoints: 5, customFieldValues: { cf_sprint: "opt_s23", cf_release: "opt_r31" }, completedDaysAgo: 3, createdDaysAgo: 30 },
  { id: "t_webhooks", projectId: "pr_platform", title: "Outgoing webhooks with retries & signing", statusId: "st_todo", priority: "normal", assigneeIds: ["u_liam"], tagIds: ["tag_backend"], dueDate: day(10), estimateHours: 16, storyPoints: 5, customFieldValues: { cf_sprint: "opt_s25", cf_release: "opt_r32" }, createdDaysAgo: 11 },
  { id: "t_audit", projectId: "pr_platform", title: "Audit log for admin actions", statusId: "st_todo", priority: "normal", assigneeIds: [], tagIds: ["tag_backend"], dueDate: day(18), estimateHours: 12, storyPoints: 5, customFieldValues: { cf_sprint: "opt_s25" }, createdDaysAgo: 9 },
  { id: "t_pgupgrade", projectId: "pr_platform", title: "Postgres 16 → 17 upgrade with zero downtime", statusId: "st_backlog", priority: "low", assigneeIds: ["u_marcus"], tagIds: ["tag_infra"], dueDate: day(45), estimateHours: 10, createdDaysAgo: 8 },
  { id: "t_observability", projectId: "pr_platform", title: "Tracing + structured logging rollout", statusId: "st_progress", priority: "normal", assigneeIds: ["u_diego", "u_marcus"], tagIds: ["tag_infra"], startDate: day(-4), dueDate: day(7), estimateHours: 14, storyPoints: 5, customFieldValues: { cf_sprint: "opt_s24" }, createdDaysAgo: 13 },
  { id: "t_search_api", projectId: "pr_platform", title: "Full-text search service (typo-tolerant)", statusId: "st_backlog", priority: "high", assigneeIds: [], tagIds: ["tag_backend"], dueDate: day(28), estimateHours: 30, storyPoints: 13, customFieldValues: { cf_sprint: "opt_s25", cf_release: "opt_r40" }, createdDaysAgo: 7 },

  // ── Bug Tracker ──
  { id: "t_bug_crash", projectId: "pr_bugs", title: "Crash on opening task with 200+ comments", description: "<p>Stack trace points at the comment virtualizer. Repro: open task #4521 on iOS.</p>", statusId: "st_progress", priority: "urgent", assigneeIds: ["u_yuki"], tagIds: ["tag_bug", "tag_mobile"], dueDate: day(0), estimateHours: 6, customFieldValues: { cf_severity: "opt_sev1" }, createdDaysAgo: 2 },
  { id: "t_bug_dup", projectId: "pr_bugs", title: "Duplicating a project drops custom field values", statusId: "st_todo", priority: "high", assigneeIds: ["u_liam"], tagIds: ["tag_bug", "tag_backend"], dueDate: day(2), estimateHours: 4, customFieldValues: { cf_severity: "opt_sev2" }, createdDaysAgo: 4 },
  { id: "t_bug_tz", projectId: "pr_bugs", title: "Due dates shift by one day in UTC+13", statusId: "st_todo", priority: "high", assigneeIds: ["u_diego"], tagIds: ["tag_bug"], dueDate: day(3), estimateHours: 5, customFieldValues: { cf_severity: "opt_sev2" }, createdDaysAgo: 6 },
  { id: "t_bug_csv", projectId: "pr_bugs", title: "CSV export escapes commas incorrectly", statusId: "st_done", priority: "normal", assigneeIds: ["u_liam"], tagIds: ["tag_bug"], dueDate: day(-1), estimateHours: 2, customFieldValues: { cf_severity: "opt_sev3" }, completedDaysAgo: 1, createdDaysAgo: 9 },
  { id: "t_bug_safari", projectId: "pr_bugs", title: "Board drag preview invisible on Safari 18", statusId: "st_todo", priority: "normal", assigneeIds: ["u_yuki"], tagIds: ["tag_bug", "tag_frontend"], dueDate: day(6), estimateHours: 3, customFieldValues: { cf_severity: "opt_sev3" }, createdDaysAgo: 5 },
  { id: "t_bug_email", projectId: "pr_bugs", title: "Digest email renders broken in Outlook", statusId: "st_done", priority: "low", assigneeIds: ["u_diego"], tagIds: ["tag_bug"], estimateHours: 3, customFieldValues: { cf_severity: "opt_sev3" }, completedDaysAgo: 4, createdDaysAgo: 12 },

  // ── Design System 2.0 ──
  { id: "t_tokens", projectId: "pr_dsys", title: "Color & elevation tokens for glass surfaces", description: "<p>Define translucency, blur and border tokens across 4 elevation levels. Map to CSS variables.</p>", statusId: "st_done", priority: "high", assigneeIds: ["u_sofia"], tagIds: ["tag_design"], dueDate: day(-6), estimateHours: 12, completedDaysAgo: 6, coverGradient: "linear-gradient(135deg,#ec4899,#a855f7)", createdDaysAgo: 24 },
  { id: "t_comp_lib", projectId: "pr_dsys", title: "Component library: buttons, inputs, menus", statusId: "st_progress", priority: "high", assigneeIds: ["u_sofia", "u_yuki"], tagIds: ["tag_design", "tag_frontend"], startDate: day(-5), dueDate: day(6), estimateHours: 28, checklist: [{ text: "Buttons (5 variants)", done: true }, { text: "Inputs & selects", done: true }, { text: "Menus & popovers", done: false }, { text: "Date picker", done: false }], createdDaysAgo: 15 },
  { id: "t_motion", projectId: "pr_dsys", title: "Motion guidelines: springs, durations, easing", statusId: "st_progress", priority: "normal", assigneeIds: ["u_sofia"], tagIds: ["tag_design"], dueDate: day(4), estimateHours: 8, createdDaysAgo: 10 },
  { id: "t_iconset", projectId: "pr_dsys", title: "Adopt MingCute icon set, audit all 240 usages", statusId: "st_done", priority: "normal", assigneeIds: ["u_yuki"], tagIds: ["tag_frontend", "tag_design"], dueDate: day(-4), estimateHours: 6, completedDaysAgo: 4, createdDaysAgo: 14 },
  { id: "t_a11y_audit", projectId: "pr_dsys", title: "Contrast audit for translucent surfaces", statusId: "st_todo", priority: "high", assigneeIds: ["u_sofia"], tagIds: ["tag_a11y", "tag_design"], dueDate: day(9), estimateHours: 10, createdDaysAgo: 8 },
  { id: "t_docs_site", projectId: "pr_dsys", title: "Storybook docs site with live tokens", statusId: "st_todo", priority: "normal", assigneeIds: ["u_yuki"], tagIds: ["tag_frontend"], dueDate: day(14), estimateHours: 16, createdDaysAgo: 6 },

  // ── Website Refresh ──
  { id: "t_landing", projectId: "pr_website", title: "New landing page hero with product tour", statusId: "st_progress", priority: "urgent", assigneeIds: ["u_sofia"], tagIds: ["tag_design", "tag_marketing"], startDate: day(-7), dueDate: day(3), estimateHours: 20, coverGradient: "linear-gradient(135deg,#a855f7,#ec4899)", createdDaysAgo: 16 },
  { id: "t_pricing", projectId: "pr_website", title: "Pricing page: new tiers + comparison table", statusId: "st_todo", priority: "high", assigneeIds: ["u_zara", "u_sofia"], tagIds: ["tag_marketing", "tag_design"], dueDate: day(8), estimateHours: 12, createdDaysAgo: 12 },
  { id: "t_stories", projectId: "pr_website", title: "Customer stories: Northwind & Lumon case studies", statusId: "st_todo", priority: "normal", assigneeIds: ["u_emma", "u_zara"], tagIds: ["tag_marketing", "tag_customer"], dueDate: day(15), estimateHours: 10, createdDaysAgo: 10 },
  { id: "t_seo", projectId: "pr_website", title: "Technical SEO pass: meta, sitemap, OG images", statusId: "st_done", priority: "normal", assigneeIds: ["u_zara"], tagIds: ["tag_marketing"], dueDate: day(-2), estimateHours: 6, completedDaysAgo: 2, createdDaysAgo: 14 },
  { id: "t_cms", projectId: "pr_website", title: "Hook blog into headless CMS", statusId: "st_todo", priority: "low", assigneeIds: [], tagIds: ["tag_frontend"], dueDate: day(20), estimateHours: 14, createdDaysAgo: 8 },

  // ── Q3 Launch Campaign ──
  { id: "t_teaser", projectId: "pr_q3", title: "Teaser video: 30s product sizzle", statusId: "st_review", priority: "urgent", assigneeIds: ["u_zara", "u_sofia"], tagIds: ["tag_marketing"], startDate: day(-5), dueDate: day(2), estimateHours: 16, customFieldValues: { cf_channel: ["opt_social", "opt_paid"], cf_budget: 8000, cf_audience: "Existing users + lookalikes" }, coverGradient: "linear-gradient(135deg,#f59e0b,#ef4444)", createdDaysAgo: 12 },
  { id: "t_email_seq", projectId: "pr_q3", title: "Launch email sequence (5 emails)", statusId: "st_drafting", priority: "high", assigneeIds: ["u_zara"], tagIds: ["tag_marketing"], dueDate: day(6), estimateHours: 12, customFieldValues: { cf_channel: ["opt_email"], cf_budget: 0, cf_audience: "All active workspaces" }, checklist: [{ text: "Announcement", done: true }, { text: "Feature deep-dive 1", done: true }, { text: "Feature deep-dive 2", done: false }, { text: "Social proof", done: false }, { text: "Last call", done: false }], createdDaysAgo: 10 },
  { id: "t_ph_launch", projectId: "pr_q3", title: "Product Hunt launch day runbook", statusId: "st_drafting", priority: "high", assigneeIds: ["u_ava", "u_zara"], tagIds: ["tag_marketing"], dueDate: day(10), estimateHours: 8, customFieldValues: { cf_channel: ["opt_social"], cf_audience: "PH community" }, createdDaysAgo: 9 },
  { id: "t_webinar", projectId: "pr_q3", title: "Live launch webinar + Q&A", statusId: "st_idea", priority: "normal", assigneeIds: ["u_ava"], tagIds: ["tag_marketing"], dueDate: day(20), estimateHours: 10, customFieldValues: { cf_channel: ["opt_email", "opt_social"], cf_budget: 1500, cf_audience: "Trial users" }, createdDaysAgo: 8 },
  { id: "t_press", projectId: "pr_q3", title: "Press kit & embargoed briefings", statusId: "st_idea", priority: "normal", assigneeIds: ["u_zara"], tagIds: ["tag_marketing"], dueDate: day(14), estimateHours: 8, customFieldValues: { cf_channel: ["opt_blog"], cf_audience: "Tech press" }, createdDaysAgo: 7 },
  { id: "t_paid_ads", projectId: "pr_q3", title: "Paid social creative set (12 variants)", statusId: "st_scheduled", priority: "high", assigneeIds: ["u_sofia", "u_zara"], tagIds: ["tag_marketing", "tag_design"], dueDate: day(4), estimateHours: 14, customFieldValues: { cf_channel: ["opt_paid", "opt_social"], cf_budget: 15000, cf_audience: "Cold — PM tool intent" }, createdDaysAgo: 11 },
  { id: "t_launch_blog", projectId: "pr_q3", title: "Launch announcement blog post", statusId: "st_live", priority: "normal", assigneeIds: ["u_zara"], tagIds: ["tag_marketing"], dueDate: day(-1), estimateHours: 5, customFieldValues: { cf_channel: ["opt_blog"], cf_audience: "Everyone" }, completedDaysAgo: 1, createdDaysAgo: 13 },

  // ── Content Pipeline ──
  { id: "t_blog_remote", projectId: "pr_content", title: "Blog: 'How we run async standups'", statusId: "st_drafting", priority: "normal", assigneeIds: ["u_zara"], tagIds: ["tag_marketing"], dueDate: day(5), estimateHours: 5, customFieldValues: { cf_channel: ["opt_blog"] }, createdDaysAgo: 6 },
  { id: "t_newsletter", projectId: "pr_content", title: "June newsletter: v4 sneak peek", statusId: "st_review", priority: "high", assigneeIds: ["u_zara", "u_emma"], tagIds: ["tag_marketing"], dueDate: day(1), estimateHours: 4, customFieldValues: { cf_channel: ["opt_email"] }, createdDaysAgo: 5 },
  { id: "t_seo_guide", projectId: "pr_content", title: "SEO pillar: 'Project management guide 2026'", statusId: "st_idea", priority: "normal", assigneeIds: [], tagIds: ["tag_marketing", "tag_research"], dueDate: day(25), estimateHours: 20, customFieldValues: { cf_channel: ["opt_blog"] }, createdDaysAgo: 4 },
  { id: "t_video_tut", projectId: "pr_content", title: "YouTube tutorial series (4 episodes)", statusId: "st_idea", priority: "low", assigneeIds: ["u_zara"], tagIds: ["tag_marketing"], dueDate: day(40), estimateHours: 24, customFieldValues: { cf_channel: ["opt_social"] }, createdDaysAgo: 3 },

  // ── Team Onboarding ──
  { id: "t_hire_be", projectId: "pr_onboard", title: "Hire senior backend engineer", description: "<p>Pipeline: 14 applicants, 3 in final round.</p>", statusId: "st_progress", priority: "high", assigneeIds: ["u_ava", "u_marcus"], tagIds: [], startDate: day(-20), dueDate: day(10), estimateHours: 20, checklist: [{ text: "JD published", done: true }, { text: "Phone screens", done: true }, { text: "Final rounds", done: false }, { text: "Offer", done: false }], createdDaysAgo: 28 },
  { id: "t_onboard_kit", projectId: "pr_onboard", title: "New-hire onboarding kit & 30-60-90 template", statusId: "st_todo", priority: "normal", assigneeIds: ["u_ava"], tagIds: [], dueDate: day(12), estimateHours: 8, createdDaysAgo: 10 },
  { id: "t_offsite", projectId: "pr_onboard", title: "Plan summer team offsite", statusId: "st_todo", priority: "low", assigneeIds: ["u_ava"], tagIds: [], dueDate: day(30), estimateHours: 12, createdDaysAgo: 9 },
  { id: "t_handbook", projectId: "pr_onboard", title: "Update engineering handbook", statusId: "st_done", priority: "normal", assigneeIds: ["u_marcus"], tagIds: [], dueDate: day(-7), estimateHours: 6, completedDaysAgo: 7, createdDaysAgo: 20 },
];

export const seedTasks: Task[] = taskSeeds.map((s, i) => T(s, i * 10));

// ─── Comments ───────────────────────────────────────────────────────────────

export const seedComments: Comment[] = [
  { id: uid("c"), taskId: "t_feed", authorId: "u_marcus", body: "Ranking contract is finalized — affinity score is a float 0–1, returned per item. @Yuki Tanaka you're unblocked on the client side.", createdAt: ago(30), reactions: [{ emoji: "🚀", userIds: ["u_yuki", "u_liam"] }], resolved: false },
  { id: uid("c"), taskId: "t_feed", authorId: "u_yuki", body: "Card components are in. Starting on pagination today — cursor-based, 20 items per page.", createdAt: ago(8), reactions: [{ emoji: "👍", userIds: ["u_marcus"] }], resolved: false },
  { id: uid("c"), taskId: "t_feed", authorId: "u_ava", body: "Looks great in the staging build. One nit: the pull-to-refresh spinner should use the brand gradient.", createdAt: ago(3), reactions: [], resolved: false },
  { id: uid("c"), taskId: "t_offline", authorId: "u_marcus", body: "Mutation queue is solid in testing — survived 500 queued ops across a forced restart. Conflict resolution is the hairy part.", createdAt: ago(20), reactions: [{ emoji: "💪", userIds: ["u_ava", "u_diego"] }], resolved: false },
  { id: uid("c"), taskId: "t_onbflow", authorId: "u_sofia", body: "New flow is in Figma — 3 steps: account → workspace → invite. @Ava Chen can you review before I hand off?", createdAt: ago(26), reactions: [], resolved: false },
  { id: uid("c"), taskId: "t_onbflow", authorId: "u_ava", body: "Reviewed and approved. Step 2 copy tweaked. Ship it 🚢", createdAt: ago(22), reactions: [{ emoji: "🎉", userIds: ["u_sofia", "u_yuki"] }], resolved: true },
  { id: uid("c"), taskId: "t_billing", authorId: "u_marcus", body: "Stripe meters are configured for api_calls and automation_runs. Aggregation job next.", createdAt: ago(14), reactions: [], resolved: false },
  { id: uid("c"), taskId: "t_bug_crash", authorId: "u_diego", body: "Repro'd on iPhone 13 / iOS 19.2. It's the virtualizer measuring all comments synchronously. Attaching trace.", createdAt: ago(10), reactions: [{ emoji: "🔥", userIds: ["u_yuki"] }], resolved: false },
  { id: uid("c"), taskId: "t_bug_crash", authorId: "u_yuki", body: "Fix is up — measurement is now lazy + windowed. QA build in TestFlight.", createdAt: ago(2), reactions: [{ emoji: "🙌", userIds: ["u_diego", "u_marcus"] }], resolved: false },
  { id: uid("c"), taskId: "t_teaser", authorId: "u_sofia", body: "First cut of the sizzle is in review — 28s, ends on the board → gantt morph. It's 🔥", createdAt: ago(7), reactions: [{ emoji: "🔥", userIds: ["u_zara", "u_ava", "u_emma"] }], resolved: false },
  { id: uid("c"), taskId: "t_teaser", authorId: "u_emma", body: "Client hat on: can we get a 15s cut for paid placements too?", createdAt: ago(5), reactions: [], resolved: false },
  { id: uid("c"), taskId: "t_comp_lib", authorId: "u_yuki", body: "Menus & popovers land tomorrow. Date picker spec needs a decision on range selection.", createdAt: ago(12), reactions: [], resolved: false },
  { id: uid("c"), taskId: "t_hire_be", authorId: "u_ava", body: "Final round scheduled with two candidates this week. Panel: Marcus, Liam, me.", createdAt: ago(18), reactions: [{ emoji: "🤞", userIds: ["u_marcus"] }], resolved: false },
];

// ─── Activities (recent history) ────────────────────────────────────────────

export const seedActivities: Activity[] = [
  { id: uid("a"), entityType: "task", entityId: "t_feed", actorId: "u_yuki", type: "status_changed", meta: { from: "To Do", to: "In Progress" }, createdAt: daysAgo(6) },
  { id: uid("a"), entityType: "task", entityId: "t_feed_sk", actorId: "u_yuki", type: "completed", meta: {}, createdAt: daysAgo(2) },
  { id: uid("a"), entityType: "task", entityId: "t_push", actorId: "u_liam", type: "status_changed", meta: { from: "In Progress", to: "In Review" }, createdAt: ago(28) },
  { id: uid("a"), entityType: "task", entityId: "t_onbflow", actorId: "u_sofia", type: "status_changed", meta: { from: "In Progress", to: "In Review" }, createdAt: ago(21) },
  { id: uid("a"), entityType: "task", entityId: "t_bug_crash", actorId: "u_diego", type: "created", meta: {}, createdAt: daysAgo(2) },
  { id: uid("a"), entityType: "task", entityId: "t_bug_crash", actorId: "u_ava", type: "priority_changed", meta: { from: "High", to: "Urgent" }, createdAt: ago(40) },
  { id: uid("a"), entityType: "task", entityId: "t_billing", actorId: "u_marcus", type: "status_changed", meta: { from: "To Do", to: "In Progress" }, createdAt: daysAgo(8) },
  { id: uid("a"), entityType: "task", entityId: "t_darkmode", actorId: "u_yuki", type: "completed", meta: {}, createdAt: daysAgo(5) },
  { id: uid("a"), entityType: "task", entityId: "t_ratelimit", actorId: "u_marcus", type: "completed", meta: {}, createdAt: daysAgo(3) },
  { id: uid("a"), entityType: "task", entityId: "t_tokens", actorId: "u_sofia", type: "completed", meta: {}, createdAt: daysAgo(6) },
  { id: uid("a"), entityType: "task", entityId: "t_launch_blog", actorId: "u_zara", type: "completed", meta: {}, createdAt: daysAgo(1) },
  { id: uid("a"), entityType: "task", entityId: "t_seo", actorId: "u_zara", type: "completed", meta: {}, createdAt: daysAgo(2) },
  { id: uid("a"), entityType: "task", entityId: "t_teaser", actorId: "u_zara", type: "status_changed", meta: { from: "Drafting", to: "In Review" }, createdAt: ago(9) },
  { id: uid("a"), entityType: "task", entityId: "t_paid_ads", actorId: "u_zara", type: "status_changed", meta: { from: "In Review", to: "Scheduled" }, createdAt: ago(15) },
  { id: uid("a"), entityType: "task", entityId: "t_bug_csv", actorId: "u_liam", type: "completed", meta: {}, createdAt: daysAgo(1) },
  { id: uid("a"), entityType: "task", entityId: "t_feed_rank", actorId: "u_liam", type: "status_changed", meta: { from: "To Do", to: "In Progress" }, createdAt: daysAgo(3) },
  { id: uid("a"), entityType: "task", entityId: "t_offline", actorId: "u_marcus", type: "checklist_updated", meta: { item: "Mutation queue" }, createdAt: daysAgo(2) },
];

// ─── Notifications (for Ava, the default signed-in user) ────────────────────

export const seedNotifications: AppNotification[] = [
  { id: uid("n"), userId: "u_ava", type: "comment", title: "Sofia Reyes commented", body: "New flow is in Figma — 3 steps: account → workspace → invite. Can you review before I hand off?", taskId: "t_onbflow", projectId: "pr_app", actorId: "u_sofia", read: false, createdAt: ago(26) },
  { id: uid("n"), userId: "u_ava", type: "status_change", title: "Task moved to In Review", body: "Rich push notifications with action buttons — moved by Liam O'Connor", taskId: "t_push", projectId: "pr_app", actorId: "u_liam", read: false, createdAt: ago(28) },
  { id: uid("n"), userId: "u_ava", type: "mention", title: "Marcus Webb mentioned you", body: "Final round scheduled with two candidates this week. Panel: Marcus, Liam, me.", taskId: "t_hire_be", projectId: "pr_onboard", actorId: "u_marcus", read: false, createdAt: ago(18) },
  { id: uid("n"), userId: "u_ava", type: "due_soon", title: "Due today", body: "Crash on opening task with 200+ comments is due today", taskId: "t_bug_crash", projectId: "pr_bugs", actorId: null, read: false, createdAt: minsAgo(45) },
  { id: uid("n"), userId: "u_ava", type: "automation", title: "Automation ran", body: "\"Urgent bugs → notify lead\" assigned Yuki Tanaka and posted a comment.", taskId: "t_bug_crash", projectId: "pr_bugs", actorId: "automation", read: true, createdAt: ago(40) },
  { id: uid("n"), userId: "u_ava", type: "comment", title: "Emma Larsson commented", body: "Client hat on: can we get a 15s cut for paid placements too?", taskId: "t_teaser", projectId: "pr_q3", actorId: "u_emma", read: true, createdAt: ago(5) },
  { id: uid("n"), userId: "u_ava", type: "status_change", title: "Task completed", body: "Launch announcement blog post was completed by Zara Ahmed", taskId: "t_launch_blog", projectId: "pr_q3", actorId: "u_zara", read: true, createdAt: daysAgo(1) },
  { id: uid("n"), userId: "u_ava", type: "watcher_update", title: "Checklist updated", body: "Marcus checked off \"Mutation queue\" on Offline mode: local cache & sync engine", taskId: "t_offline", projectId: "pr_app", actorId: "u_marcus", read: true, createdAt: daysAgo(2) },
];

// ─── Time entries ───────────────────────────────────────────────────────────

const TE = (taskId: string, userId: string, dayOffset: number, mins: number, note: string, billable = true): TimeEntry => ({
  id: uid("te"), taskId, userId, date: day(dayOffset), durationMins: mins, note, billable,
});

export const seedTimeEntries: TimeEntry[] = [
  TE("t_feed", "u_yuki", 0, 150, "Feed card pagination"),
  TE("t_feed", "u_yuki", -1, 240, "Card components"),
  TE("t_feed", "u_yuki", -2, 180, "Card components"),
  TE("t_feed_rank", "u_liam", -1, 200, "Affinity scoring"),
  TE("t_feed_rank", "u_liam", 0, 120, "Affinity scoring"),
  TE("t_offline", "u_marcus", -1, 300, "Mutation queue tests"),
  TE("t_offline", "u_marcus", -2, 260, "Mutation queue"),
  TE("t_offline", "u_marcus", -4, 220, "Storage layer"),
  TE("t_billing", "u_marcus", 0, 180, "Usage aggregation"),
  TE("t_billing", "u_marcus", -3, 240, "Stripe meters"),
  TE("t_onbflow", "u_sofia", -1, 200, "Onboarding screens"),
  TE("t_onbflow", "u_sofia", -3, 280, "Flow exploration"),
  TE("t_bug_crash", "u_yuki", 0, 90, "Virtualizer fix"),
  TE("t_bug_crash", "u_diego", -1, 60, "Repro + trace", false),
  TE("t_teaser", "u_sofia", -2, 320, "Video edit"),
  TE("t_teaser", "u_zara", -1, 120, "Script + VO"),
  TE("t_comp_lib", "u_yuki", -1, 160, "Menus"),
  TE("t_comp_lib", "u_sofia", -2, 200, "Input states"),
  TE("t_sso", "u_liam", -2, 280, "SAML assertions"),
  TE("t_sso", "u_liam", -4, 240, "IdP config"),
  TE("t_email_seq", "u_zara", 0, 100, "Deep-dive email 2"),
  TE("t_hire_be", "u_ava", -1, 90, "Candidate reviews", false),
  TE("t_landing", "u_sofia", 0, 140, "Hero iterations"),
  TE("t_observability", "u_diego", -1, 180, "Trace spans"),
];

// ─── Docs ───────────────────────────────────────────────────────────────────

export const seedDocs: Doc[] = [
  {
    id: "doc_v4_prd", spaceId: "sp_product", title: "Mobile App v4 — PRD", icon: "mingcute:document-2-line", coverGradient: "linear-gradient(135deg,#6366f1,#a855f7)",
    content: `<h1>Mobile App v4 — Product Requirements</h1><p><strong>Status:</strong> Approved · <strong>Owner:</strong> Ava Chen · <strong>Target:</strong> end of next month</p><h2>Why now</h2><p>v3 retention plateaued at 41% (D30). User interviews point to three gaps: a noisy home experience, no offline support, and slow cold starts. v4 addresses all three.</p><h2>Goals</h2><ul><li>D30 retention ≥ 48%</li><li>Cold start &lt; 1.5s on mid-range Android</li><li>Offline create/edit with reliable sync</li></ul><h2>Scope</h2><h3>1. Personalized home feed</h3><p>Ranked by recency × affinity. Chronological fallback behind a flag for the A/B.</p><h3>2. Offline mode</h3><p>Local-first storage with a mutation queue. Conflicts: last-write-wins per field, additive merge for lists.</p><h3>3. Onboarding</h3><p>Cut from 7 steps to 3. Target drop-off &lt; 15%.</p><h2>Non-goals</h2><p>Tablet layouts, widget marketplace (v4.1+).</p>`,
    createdBy: "u_ava", createdAt: daysAgo(40), updatedAt: daysAgo(3),
  },
  {
    id: "doc_eng_rituals", spaceId: "sp_product", title: "Engineering Rituals", icon: "mingcute:calendar-2-line", coverGradient: null,
    content: `<h1>Engineering Rituals</h1><h2>Async standup</h2><p>Post in the standup thread by 10:30 local: <em>yesterday / today / blockers</em>. No meeting.</p><h2>Sprint cadence</h2><ul><li>2-week sprints, start Monday</li><li>Planning: 45 min, Monday</li><li>Retro: 30 min, alternate Fridays</li></ul><h2>Code review SLAs</h2><p>First review within 4 working hours. Approvals require green CI and one reviewer (two for migrations).</p><h2>Incident process</h2><p>Sev1: page on-call, open incident channel, post-mortem within 48h — blameless, action items tracked in Bug Tracker.</p>`,
    createdBy: "u_marcus", createdAt: daysAgo(120), updatedAt: daysAgo(12),
  },
  {
    id: "doc_brand", spaceId: "sp_design", title: "Brand & Voice Guidelines", icon: "mingcute:magic-3-line", coverGradient: "linear-gradient(135deg,#ec4899,#a855f7)",
    content: `<h1>Brand &amp; Voice</h1><h2>Personality</h2><p>Confident, warm, precise. We sound like a sharp colleague — never like a robot or a cheerleader.</p><h2>Voice rules</h2><ul><li>Active voice. Short sentences.</li><li>No jargon where a plain word works.</li><li>Celebrate user wins, not our features.</li></ul><h2>Visual language</h2><p>Glass surfaces, soft depth, vivid gradients used sparingly. Motion communicates causality — nothing moves without a reason.</p>`,
    createdBy: "u_sofia", createdAt: daysAgo(60), updatedAt: daysAgo(6),
  },
  {
    id: "doc_q3_brief", spaceId: "sp_marketing", title: "Q3 Launch Brief", icon: "mingcute:target-line", coverGradient: "linear-gradient(135deg,#f59e0b,#ef4444)",
    content: `<h1>Q3 Launch Brief</h1><p><strong>Launch window:</strong> first week of next month · <strong>Budget:</strong> $32k</p><h2>Message house</h2><p><strong>Roof:</strong> "Your work, finally in flow."</p><ul><li>Pillar 1 — One home for plans, tasks and docs</li><li>Pillar 2 — Automations that feel like magic</li><li>Pillar 3 — Fast everywhere, even offline</li></ul><h2>Channels</h2><p>Email (5-part sequence), Product Hunt, paid social (12 creatives), launch webinar, press briefings under embargo.</p><h2>Success</h2><p>4k signups in week 1, 12% trial→paid in 30 days.</p>`,
    createdBy: "u_zara", createdAt: daysAgo(20), updatedAt: daysAgo(1),
  },
  {
    id: "doc_meeting", spaceId: null, title: "Leads sync — weekly notes", icon: "mingcute:mic-line", coverGradient: null,
    content: `<h1>Leads sync — weekly notes</h1><h2>This week</h2><ul><li>v4 on track; offline conflict resolution is the main risk</li><li>Billing migration starts behind a flag next sprint</li><li>Hiring: 2 finalists for senior backend</li></ul><h2>Decisions</h2><ul><li>Ship dark mode default-on for new installs</li><li>Launch webinar moved one week later to avoid holiday</li></ul><h2>Action items</h2><ul><li>Ava — confirm webinar date with panelists</li><li>Marcus — publish updated incident runbook</li><li>Zara — final budget split for paid social</li></ul>`,
    createdBy: "u_ava", createdAt: daysAgo(7), updatedAt: ago(20),
  },
];

// ─── Goals ──────────────────────────────────────────────────────────────────

export const seedGoals: Goal[] = [
  { id: "g_retention", name: "Lift D30 retention to 48%", description: "v4 feed + offline mode are the main levers.", ownerId: "u_ava", status: "on_track", dueDate: day(50), color: "#6366f1", createdAt: daysAgo(60), keyResults: [
    { id: uid("kr"), name: "D30 retention", type: "percent", current: 44, target: 48, unit: "%" },
    { id: uid("kr"), name: "Cold start p75", type: "number", current: 2.1, target: 1.5, unit: "s" },
    { id: uid("kr"), name: "Onboarding completion", type: "percent", current: 71, target: 85, unit: "%" },
  ]},
  { id: "g_arr", name: "Reach $2.4M ARR", description: "Usage-based billing + enterprise SSO unlock the mid-market.", ownerId: "u_marcus", status: "at_risk", dueDate: day(80), color: "#f59e0b", createdAt: daysAgo(90), keyResults: [
    { id: uid("kr"), name: "ARR", type: "currency", current: 1.9, target: 2.4, unit: "M" },
    { id: uid("kr"), name: "Enterprise deals closed", type: "number", current: 3, target: 8, unit: "" },
    { id: uid("kr"), name: "Billing migration live", type: "boolean", current: 0, target: 1, unit: "" },
  ]},
  { id: "g_launch", name: "Flawless v4 launch", description: "Coordinated launch across product, design and marketing.", ownerId: "u_zara", status: "on_track", dueDate: day(35), color: "#ec4899", createdAt: daysAgo(30), keyResults: [
    { id: uid("kr"), name: "Week-1 signups", type: "number", current: 0, target: 4000, unit: "" },
    { id: uid("kr"), name: "Launch assets ready", type: "percent", current: 62, target: 100, unit: "%" },
    { id: uid("kr"), name: "Press briefings booked", type: "number", current: 4, target: 6, unit: "" },
  ]},
  { id: "g_quality", name: "Zero Sev-1 bugs in production", description: "Quality bar for the v4 cycle.", ownerId: "u_diego", status: "off_track", dueDate: day(40), color: "#f43f5e", createdAt: daysAgo(45), keyResults: [
    { id: uid("kr"), name: "Open Sev-1s", type: "number", current: 1, target: 0, unit: "" },
    { id: uid("kr"), name: "Crash-free sessions", type: "percent", current: 99.4, target: 99.9, unit: "%" },
  ]},
];

// ─── Automations ────────────────────────────────────────────────────────────

export const seedAutomations: Automation[] = [
  { id: "auto_urgent_bug", projectId: "pr_bugs", name: "Urgent bugs → notify lead", enabled: true, trigger: { type: "priority_changed", config: { priority: "urgent" } }, conditions: [], actions: [{ type: "assign_user", config: { userId: "u_yuki" } }, { type: "notify_user", config: { userId: "u_marcus" } }, { type: "post_comment", config: { body: "⚡ Auto-escalated: priority set to Urgent. Yuki assigned, Marcus notified." } }], runs: 14, lastRunAt: ago(40), createdAt: daysAgo(80) },
  { id: "auto_done_archive", projectId: "pr_bugs", name: "Completed bugs auto-archive after done", enabled: false, trigger: { type: "task_completed", config: {} }, conditions: [{ field: "priority", operator: "is_not", value: "urgent" }], actions: [{ type: "archive_task", config: {} }], runs: 31, lastRunAt: daysAgo(9), createdAt: daysAgo(70) },
  { id: "auto_review_assign", projectId: "pr_app", name: "In Review → add QA", enabled: true, trigger: { type: "status_changed", config: { statusId: "st_review" } }, conditions: [], actions: [{ type: "assign_user", config: { userId: "u_diego" } }, { type: "post_comment", config: { body: "👀 Moved to review — Diego added for QA." } }], runs: 22, lastRunAt: ago(21), createdAt: daysAgo(50) },
  { id: "auto_new_triage", projectId: "pr_bugs", name: "New bug → triage defaults", enabled: true, trigger: { type: "task_created", config: {} }, conditions: [], actions: [{ type: "set_priority", config: { priority: "high" } }, { type: "add_tag", config: { tagId: "tag_bug" } }], runs: 47, lastRunAt: daysAgo(2), createdAt: daysAgo(100) },
  { id: "auto_campaign_live", projectId: "pr_q3", name: "Live campaign → notify owner", enabled: true, trigger: { type: "status_changed", config: { statusId: "st_live" } }, conditions: [], actions: [{ type: "notify_user", config: { userId: "u_zara" } }, { type: "post_comment", config: { body: "🎉 This campaign asset is live!" } }], runs: 6, lastRunAt: daysAgo(1), createdAt: daysAgo(25) },
];

// ─── Dashboards ─────────────────────────────────────────────────────────────

export const seedDashboards: Dashboard[] = [
  { id: "dash_exec", name: "Executive Overview", icon: "mingcute:chart-pie-line", createdBy: "u_ava", createdAt: daysAgo(30), widgets: [
    { id: uid("w"), type: "numberCard", title: "Open tasks", w: 3, h: 1, config: { metric: "open" } },
    { id: uid("w"), type: "numberCard", title: "Completed this week", w: 3, h: 1, config: { metric: "completedWeek" } },
    { id: uid("w"), type: "numberCard", title: "Overdue", w: 3, h: 1, config: { metric: "overdue" } },
    { id: uid("w"), type: "numberCard", title: "Hours tracked this week", w: 3, h: 1, config: { metric: "hoursWeek" } },
    { id: uid("w"), type: "tasksByStatus", title: "Tasks by status", w: 6, h: 2, config: {} },
    { id: uid("w"), type: "completionTrend", title: "Completion trend (14 days)", w: 6, h: 2, config: {} },
    { id: uid("w"), type: "tasksByAssignee", title: "Open tasks by assignee", w: 6, h: 2, config: {} },
    { id: uid("w"), type: "tasksByPriority", title: "Priority breakdown", w: 6, h: 2, config: {} },
    { id: uid("w"), type: "goalProgress", title: "Goals", w: 6, h: 2, config: {} },
    { id: uid("w"), type: "recentActivity", title: "Recent activity", w: 6, h: 2, config: {} },
  ]},
  { id: "dash_sprint", name: "Sprint Health", icon: "mingcute:pulse-line", createdBy: "u_marcus", createdAt: daysAgo(14), widgets: [
    { id: uid("w"), type: "numberCard", title: "In progress", w: 3, h: 1, config: { metric: "inProgress" } },
    { id: uid("w"), type: "numberCard", title: "In review", w: 3, h: 1, config: { metric: "inReview" } },
    { id: uid("w"), type: "numberCard", title: "Overdue", w: 3, h: 1, config: { metric: "overdue" } },
    { id: uid("w"), type: "numberCard", title: "Open tasks", w: 3, h: 1, config: { metric: "open" } },
    { id: uid("w"), type: "workloadBar", title: "Workload by person", w: 6, h: 2, config: {} },
    { id: uid("w"), type: "timeTracked", title: "Time tracked (7 days)", w: 6, h: 2, config: {} },
    { id: uid("w"), type: "upcomingTasks", title: "Due in the next 7 days", w: 12, h: 2, config: {} },
  ]},
];

// ─── Integrations ───────────────────────────────────────────────────────────

export const seedIntegrations: Integration[] = [
  { id: "int_slack", name: "Slack", icon: "mingcute:message-3-line", description: "Get task updates in channels, create tasks from messages and unfurl links.", category: "communication", connected: true, color: "#e01e5a" },
  { id: "int_github", name: "GitHub", icon: "mingcute:github-line", description: "Link PRs and branches to tasks; auto-move tasks when PRs merge.", category: "dev", connected: true, color: "#8b5cf6" },
  { id: "int_gitlab", name: "GitLab", icon: "mingcute:git-branch-line", description: "Connect merge requests and pipelines to your workflow.", category: "dev", connected: false, color: "#fc6d26" },
  { id: "int_figma", name: "Figma", icon: "mingcute:pen-line", description: "Embed live frames in tasks and docs; get notified on new comments.", category: "design", connected: true, color: "#a259ff" },
  { id: "int_gdrive", name: "Google Drive", icon: "mingcute:drive-line", description: "Attach Drive files with live previews and permission checks.", category: "storage", connected: false, color: "#34a853" },
  { id: "int_gcal", name: "Google Calendar", icon: "mingcute:calendar-line", description: "Two-way sync of due dates and scheduled tasks.", category: "calendar", connected: true, color: "#4285f4" },
  { id: "int_zoom", name: "Zoom", icon: "mingcute:video-line", description: "Attach recordings and start meetings from any task.", category: "communication", connected: false, color: "#2d8cff" },
  { id: "int_teams", name: "Microsoft Teams", icon: "mingcute:group-2-line", description: "Notifications, previews and task creation inside Teams.", category: "communication", connected: false, color: "#6264a7" },
  { id: "int_zapier", name: "Zapier", icon: "mingcute:lightning-line", description: "Connect 6,000+ apps with no-code automation recipes.", category: "ai", connected: false, color: "#ff4f00" },
  { id: "int_sentry", name: "Sentry", icon: "mingcute:alert-octagon-line", description: "Create bug tasks from new issues; link stack traces to tasks.", category: "dev", connected: true, color: "#923aff" },
  { id: "int_intercom", name: "Intercom", icon: "mingcute:chat-2-line", description: "Escalate conversations into tasks with full context.", category: "crm", connected: false, color: "#1f8ded" },
  { id: "int_openai", name: "AI Assist", icon: "mingcute:sparkles-line", description: "Summarize threads, draft descriptions and suggest subtasks with AI.", category: "ai", connected: true, color: "#10b981" },
  { id: "int_dropbox", name: "Dropbox", icon: "mingcute:box-2-line", description: "Attach and preview Dropbox files in tasks.", category: "storage", connected: false, color: "#0061ff" },
  { id: "int_hubspot", name: "HubSpot", icon: "mingcute:building-2-line", description: "Sync deals to projects and keep CRM data alongside work.", category: "crm", connected: false, color: "#ff7a59" },
];
