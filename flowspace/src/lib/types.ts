// ─── Flowspace domain model ──────────────────────────────────────────────────

export type ID = string;

export type Role = "owner" | "admin" | "member" | "guest";

export interface User {
  id: ID;
  name: string;
  email: string;
  initials: string;
  /** tailwind-compatible hex for avatar gradient start */
  color: string;
  role: Role;
  title: string;
  online: boolean;
  /** weekly capacity in hours, used by workload view */
  capacityHours: number;
}

export interface Workspace {
  id: ID;
  name: string;
  plan: "free" | "business" | "enterprise";
  color: string;
  createdAt: string;
}

export interface Space {
  id: ID;
  name: string;
  icon: string; // mingcute icon name
  color: string;
  description: string;
  memberIds: ID[];
  private: boolean;
  archived: boolean;
  order: number;
}

export type StatusKind = "open" | "active" | "done" | "closed";

export interface Status {
  id: ID;
  name: string;
  color: string;
  kind: StatusKind;
  order: number;
}

export type Priority = "urgent" | "high" | "normal" | "low" | "none";

export type CustomFieldType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "checkbox"
  | "url"
  | "currency"
  | "rating"
  | "people"
  | "progress";

export interface CustomFieldOption {
  id: ID;
  label: string;
  color: string;
}

export interface CustomFieldDef {
  id: ID;
  name: string;
  type: CustomFieldType;
  icon: string;
  options?: CustomFieldOption[];
}

export type ViewType =
  | "overview"
  | "list"
  | "board"
  | "table"
  | "calendar"
  | "gantt"
  | "workload"
  | "activity";

export interface Project {
  id: ID;
  spaceId: ID;
  name: string;
  icon: string;
  color: string;
  description: string;
  statuses: Status[];
  customFields: CustomFieldDef[];
  views: ViewType[];
  defaultView: ViewType;
  memberIds: ID[];
  archived: boolean;
  order: number;
  createdAt: string;
  startDate?: string | null;
  targetDate?: string | null;
}

export interface Tag {
  id: ID;
  name: string;
  color: string;
}

export interface Attachment {
  id: ID;
  name: string;
  sizeKb: number;
  type: "image" | "pdf" | "doc" | "sheet" | "figma" | "zip" | "other";
  uploadedBy: ID;
  uploadedAt: string;
}

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export type DependencyType = "blocks" | "waiting_on";

export interface Dependency {
  id: ID;
  /** the task that blocks / is waited on */
  fromTaskId: ID;
  /** the task that is blocked / waiting */
  toTaskId: ID;
  type: DependencyType;
}

export interface Task {
  id: ID;
  projectId: ID;
  parentId: ID | null;
  title: string;
  description: string; // html
  statusId: ID;
  priority: Priority;
  assigneeIds: ID[];
  watcherIds: ID[];
  tagIds: ID[];
  startDate: string | null; // ISO date (yyyy-MM-dd)
  dueDate: string | null;
  estimateHours: number | null;
  storyPoints: number | null;
  customFieldValues: Record<ID, unknown>;
  checklist: ChecklistItem[];
  attachments: Attachment[];
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy: ID;
  completedAt: string | null;
  coverGradient: string | null;
  archived: boolean;
}

export interface Reaction {
  emoji: string;
  userIds: ID[];
}

export interface Comment {
  id: ID;
  taskId: ID;
  authorId: ID;
  body: string;
  createdAt: string;
  reactions: Reaction[];
  resolved: boolean;
}

export type ActivityType =
  | "created"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "unassigned"
  | "due_date_changed"
  | "commented"
  | "tag_added"
  | "tag_removed"
  | "attachment_added"
  | "subtask_added"
  | "subtask_completed"
  | "time_logged"
  | "moved"
  | "completed"
  | "reopened"
  | "automation_run"
  | "field_changed"
  | "renamed"
  | "checklist_updated"
  | "dependency_added";

export interface Activity {
  id: ID;
  entityType: "task" | "project" | "doc" | "goal" | "space";
  entityId: ID;
  actorId: ID | "automation";
  type: ActivityType;
  meta: Record<string, string>;
  createdAt: string;
}

export type NotificationType =
  | "assigned"
  | "mention"
  | "comment"
  | "status_change"
  | "due_soon"
  | "automation"
  | "watcher_update";

export interface AppNotification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  taskId: ID | null;
  projectId: ID | null;
  actorId: ID | "automation" | null;
  read: boolean;
  createdAt: string;
}

export interface TimeEntry {
  id: ID;
  taskId: ID;
  userId: ID;
  date: string; // yyyy-MM-dd
  durationMins: number;
  note: string;
  billable: boolean;
}

export interface RunningTimer {
  taskId: ID;
  userId: ID;
  startedAt: string; // ISO timestamp
}

export interface Doc {
  id: ID;
  spaceId: ID | null;
  title: string;
  icon: string;
  coverGradient: string | null;
  content: string; // html
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = "on_track" | "at_risk" | "off_track" | "completed";

export interface KeyResult {
  id: ID;
  name: string;
  type: "number" | "percent" | "currency" | "boolean";
  current: number;
  target: number;
  unit: string;
}

export interface Goal {
  id: ID;
  name: string;
  description: string;
  ownerId: ID;
  status: GoalStatus;
  dueDate: string | null;
  keyResults: KeyResult[];
  color: string;
  createdAt: string;
}

// ─── Automations ────────────────────────────────────────────────────────────

export type AutomationTriggerType =
  | "status_changed"
  | "task_created"
  | "priority_changed"
  | "assignee_added"
  | "due_date_arrives"
  | "tag_added"
  | "task_completed";

export type AutomationActionType =
  | "set_status"
  | "set_priority"
  | "assign_user"
  | "add_tag"
  | "set_due_date_relative"
  | "post_comment"
  | "notify_user"
  | "move_to_project"
  | "create_subtask"
  | "archive_task";

export interface AutomationTrigger {
  type: AutomationTriggerType;
  /** trigger-specific config, e.g. { statusId } for status_changed */
  config: Record<string, string>;
}

export interface AutomationCondition {
  field: "priority" | "status" | "assignee" | "tag";
  operator: "is" | "is_not";
  value: string;
}

export interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, string>;
}

export interface Automation {
  id: ID;
  projectId: ID | null; // null = workspace-wide
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  runs: number;
  lastRunAt: string | null;
  createdAt: string;
}

// ─── Dashboards ─────────────────────────────────────────────────────────────

export type WidgetType =
  | "tasksByStatus"
  | "tasksByAssignee"
  | "tasksByPriority"
  | "completionTrend"
  | "numberCard"
  | "recentActivity"
  | "timeTracked"
  | "workloadBar"
  | "upcomingTasks"
  | "goalProgress";

export interface Widget {
  id: ID;
  type: WidgetType;
  title: string;
  /** grid columns spanned (of 12) */
  w: number;
  /** approx row height units */
  h: number;
  config: Record<string, string>;
}

export interface Dashboard {
  id: ID;
  name: string;
  icon: string;
  widgets: Widget[];
  createdBy: ID;
  createdAt: string;
}

// ─── Integrations ───────────────────────────────────────────────────────────

export interface Integration {
  id: ID;
  name: string;
  icon: string;
  description: string;
  category: "communication" | "dev" | "storage" | "design" | "calendar" | "ai" | "crm";
  connected: boolean;
  color: string;
}

// ─── View state (filters / grouping / sorting, per project view) ────────────

export type GroupBy = "status" | "assignee" | "priority" | "tag" | "dueDate" | "none";
export type SortBy = "manual" | "dueDate" | "priority" | "title" | "createdAt" | "updatedAt";

export interface ViewState {
  groupBy: GroupBy;
  sortBy: SortBy;
  sortDir: "asc" | "desc";
  filterAssignees: ID[];
  filterPriorities: Priority[];
  filterStatuses: ID[];
  filterTags: ID[];
  search: string;
  showCompleted: boolean;
  showSubtasks: boolean;
  collapsedGroups: string[];
}

export const defaultViewState: ViewState = {
  groupBy: "status",
  sortBy: "manual",
  sortDir: "asc",
  filterAssignees: [],
  filterPriorities: [],
  filterStatuses: [],
  filterTags: [],
  search: "",
  showCompleted: true,
  showSubtasks: false,
  collapsedGroups: [],
};
