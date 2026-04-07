import {
  PANE_KIND,
  SESSION_STATUS,
  type DirectoryGroup,
  type PaneKind,
  type SessionStatus,
  type TabGroup,
  type UnifiedPane,
} from "../models/session.ts";
import type { WeztermPane } from "../models/wezterm.ts";

export type DetectInput = {
  panes: WeztermPane[];
};

export type SessionDetectionService = {
  groupByDirectory: (input: DetectInput) => DirectoryGroup[];
  detectStatusFromText: (paneText: string) => SessionStatus;
};

const BUSY_TITLES = new Set([
  "nvim",
  "vim",
  "vi",
  "node",
  "python",
  "python3",
  "ruby",
  "cargo",
  "go",
]);

const isClaudePrefix = (char: string): boolean => {
  if (char === "\u2733") return true;
  const code = char.charCodeAt(0);
  return code >= 0x2800 && code <= 0x28ff;
};

const classifyPane = (pane: WeztermPane): PaneKind => {
  const firstChar = pane.title.charAt(0);
  if (isClaudePrefix(firstChar)) return PANE_KIND.claude;
  if (BUSY_TITLES.has(pane.title)) return PANE_KIND.busy;
  return PANE_KIND.available;
};

const detectStatusFromTitle = (title: string): SessionStatus => {
  const firstChar = title.charAt(0);
  if (firstChar === "\u2733") return SESSION_STATUS.toolRunning;
  const code = firstChar.charCodeAt(0);
  if (code >= 0x2800 && code <= 0x28ff) return SESSION_STATUS.thinking;
  return SESSION_STATUS.idle;
};

export const detectStatusFromText = (paneText: string): SessionStatus => {
  const lines = paneText.split("\n");
  const lastLines = lines.slice(-20);
  const joined = lastLines.join("\n");

  if (/Do you want to proceed\?|Esc to cancel/.test(joined)) {
    return SESSION_STATUS.waitingConfirm;
  }

  if (/Running…/.test(joined)) {
    return SESSION_STATUS.toolRunning;
  }

  if (/ろーでぃんぐ…|Thinking|⏳/.test(joined)) {
    return SESSION_STATUS.thinking;
  }

  const trimmedLines = lastLines.map((l) => l.trim()).filter((l) => l.length > 0);
  const lastNonEmpty = trimmedLines[trimmedLines.length - 1] ?? "";

  if (/^❯\s*$/.test(lastNonEmpty) || /-- INSERT --/.test(joined)) {
    return SESSION_STATUS.waitingInput;
  }

  return SESSION_STATUS.idle;
};

const formatCwd = (cwd: string): string => {
  const prefix = "file://";
  const path = cwd.startsWith(prefix) ? cwd.slice(prefix.length) : cwd;
  const home = process.env["HOME"] ?? "";
  if (home && path.startsWith(home)) {
    return `~${path.slice(home.length)}`;
  }
  return path;
};

const toUnifiedPane = (pane: WeztermPane): UnifiedPane => {
  const kind = classifyPane(pane);
  if (kind === PANE_KIND.claude) {
    return {
      pane,
      kind,
      claudeStatus: detectStatusFromTitle(pane.title),
      claudeTitle: pane.title.slice(2),
    };
  }
  return { pane, kind };
};

export const createSessionDetectionService = (): SessionDetectionService => ({
  groupByDirectory: ({ panes }: DetectInput): DirectoryGroup[] => {
    const tabMap = new Map<
      number,
      { cwd: string; tabTitle: string; activePaneTitle: string; panes: UnifiedPane[] }
    >();

    for (const pane of panes) {
      const tabId = pane.tab_id;
      const unified = toUnifiedPane(pane);
      const existing = tabMap.get(tabId);
      if (existing) {
        existing.panes.push(unified);
        if (pane.is_active) {
          existing.activePaneTitle = pane.title;
        }
      } else {
        tabMap.set(tabId, {
          cwd: formatCwd(pane.cwd),
          tabTitle: pane.tab_title,
          activePaneTitle: pane.is_active ? pane.title : "",
          panes: [unified],
        });
      }
    }

    const tabGroups: (TabGroup & { cwd: string })[] = [...tabMap.entries()]
      .toSorted(([a], [b]) => a - b)
      .map(([tabId, group]) => ({
        tabId,
        tabName: group.tabTitle || group.activePaneTitle || `Tab ${tabId}`,
        cwd: group.cwd,
        panes: group.panes.toSorted((a, b) => {
          const kindOrder = { claude: 0, available: 1, busy: 2 } as const;
          const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
          if (kindDiff !== 0) return kindDiff;
          if (a.kind === "claude" && b.kind === "claude") {
            const statusOrder: Record<string, number> = {
              "waiting-confirm": 0,
              "waiting-input": 1,
              thinking: 2,
              "tool-running": 3,
              idle: 4,
            };
            const sa = statusOrder[a.claudeStatus ?? "idle"] ?? 4;
            const sb = statusOrder[b.claudeStatus ?? "idle"] ?? 4;
            if (sa !== sb) return sa - sb;
          }
          return a.pane.pane_id - b.pane.pane_id;
        }),
      }));

    const dirMap = new Map<string, TabGroup[]>();
    for (const tab of tabGroups) {
      const existing = dirMap.get(tab.cwd);
      if (existing) {
        existing.push({ tabId: tab.tabId, tabName: tab.tabName, panes: tab.panes });
      } else {
        dirMap.set(tab.cwd, [{ tabId: tab.tabId, tabName: tab.tabName, panes: tab.panes }]);
      }
    }

    return [...dirMap.entries()].map(([cwd, tabs]) => ({ cwd, tabs }));
  },

  detectStatusFromText,
});
