import type { WeztermPane } from "./wezterm.ts";

export const SESSION_STATUS = {
  waitingInput: "waiting-input",
  waitingConfirm: "waiting-confirm",
  thinking: "thinking",
  toolRunning: "tool-running",
  idle: "idle",
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  [SESSION_STATUS.waitingInput]: "waiting",
  [SESSION_STATUS.waitingConfirm]: "confirm",
  [SESSION_STATUS.thinking]: "thinking",
  [SESSION_STATUS.toolRunning]: "running",
  [SESSION_STATUS.idle]: "idle",
};

export const SESSION_STATUS_COLOR: Record<SessionStatus, string> = {
  [SESSION_STATUS.waitingInput]: "green",
  [SESSION_STATUS.waitingConfirm]: "yellow",
  [SESSION_STATUS.thinking]: "blue",
  [SESSION_STATUS.toolRunning]: "magenta",
  [SESSION_STATUS.idle]: "gray",
};

export type ClaudeSession = {
  pane: WeztermPane;
  status: SessionStatus;
  taskTitle: string;
};

export const PANE_KIND = {
  claude: "claude",
  available: "available",
  busy: "busy",
} as const;

export type PaneKind = (typeof PANE_KIND)[keyof typeof PANE_KIND];

export type UnifiedPane = {
  pane: WeztermPane;
  kind: PaneKind;
  claudeStatus?: SessionStatus;
  claudeTitle?: string;
};

export type TabGroup = {
  tabId: number;
  tabName: string;
  panes: UnifiedPane[];
};

export type DirectoryGroup = {
  cwd: string;
  tabs: TabGroup[];
};
