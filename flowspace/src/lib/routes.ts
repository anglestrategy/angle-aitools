import type { ID, ViewType } from "./types";

// Query-param routes keep every page statically exportable (GitHub Pages)
// while still supporting user-created entity ids at runtime.
export const projectUrl = (id: ID, view?: ViewType | string) =>
  `/app/project?id=${id}${view ? `&view=${view}` : ""}`;
export const spaceUrl = (id: ID) => `/app/space?id=${id}`;
export const docUrl = (id: ID) => `/app/doc?id=${id}`;
export const dashboardUrl = (id: ID) => `/app/dashboard?id=${id}`;
export const taskUrl = (projectId: ID, taskId: ID) => `/app/project?id=${projectId}&task=${taskId}`;
