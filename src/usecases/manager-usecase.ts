import type { DirectoryGroup, UnifiedPane } from "../models/session.ts";
import type { UsecaseContext } from "./index.ts";
import { escapeShellArg } from "../utils/ShellUtils.ts";

export type ManagerListOutput = {
  directoryGroups: DirectoryGroup[];
};

export type ManagerUsecase = {
  list: () => Promise<ManagerListOutput>;
  enrichStatus: (up: UnifiedPane) => Promise<UnifiedPane>;
  navigateTo: (up: UnifiedPane) => Promise<void>;
  launchClaude: (
    up: UnifiedPane,
    prompt: string,
    options: { useWorktree: boolean },
  ) => Promise<void>;
  highlightTab: (up: UnifiedPane) => Promise<void>;
  unhighlightTab: (up: UnifiedPane) => Promise<void>;
};

export const createManagerUsecase = (context: UsecaseContext): ManagerUsecase => {
  const { wezterm, sessionDetection } = context.services;

  return {
    list: async (): Promise<ManagerListOutput> => {
      const panes = await wezterm.listPanes();
      const directoryGroups = sessionDetection.groupByDirectory({ panes });
      return { directoryGroups };
    },

    enrichStatus: async (up: UnifiedPane): Promise<UnifiedPane> => {
      if (up.kind !== "claude") return up;
      try {
        const paneText = await wezterm.getText(up.pane.pane_id);
        const status = sessionDetection.detectStatusFromText(paneText);
        return { ...up, claudeStatus: status };
      } catch {
        return up;
      }
    },

    navigateTo: async (up: UnifiedPane): Promise<void> => {
      await wezterm.navigateToPane({
        paneId: up.pane.pane_id,
        tabId: up.pane.tab_id,
      });
    },

    launchClaude: async (
      up: UnifiedPane,
      prompt: string,
      options: { useWorktree: boolean },
    ): Promise<void> => {
      const escapedPrompt = escapeShellArg(prompt);
      const flag = options.useWorktree ? "-w -- " : "";
      await wezterm.sendCommand({
        paneId: up.pane.pane_id,
        command: `claude ${flag}${escapedPrompt}`,
      });
    },

    highlightTab: async (up: UnifiedPane): Promise<void> => {
      const title = up.claudeTitle ?? up.pane.title;
      await wezterm.setTabTitle({
        tabId: up.pane.tab_id,
        title: `\u25B6 ${title}`,
      });
    },

    unhighlightTab: async (up: UnifiedPane): Promise<void> => {
      await wezterm.setTabTitle({
        tabId: up.pane.tab_id,
        title: "",
      });
    },
  };
};
