import type { ServiceContext } from "./index.ts";
import type { WeztermPane } from "../models/wezterm.ts";

export type CreateNewTabInput = {
  cwd?: string;
};

export type SplitPaneServiceInput = {
  paneId?: number;
  direction: "right" | "bottom";
  cwd?: string;
};

export type SendCommandInput = {
  paneId: number;
  command: string;
};

export type SendTextServiceInput = {
  paneId: number;
  text: string;
};

export type NavigateToPaneInput = {
  paneId: number;
  tabId: number;
};

export type SetTabTitleServiceInput = {
  tabId: number;
  title: string;
};

export type WeztermService = {
  listPanes: () => Promise<WeztermPane[]>;
  createNewTab: (input: CreateNewTabInput) => Promise<number>;
  splitPane: (input: SplitPaneServiceInput) => Promise<number>;
  sendCommand: (input: SendCommandInput) => Promise<void>;
  sendText: (input: SendTextServiceInput) => Promise<void>;
  navigateToPane: (input: NavigateToPaneInput) => Promise<void>;
  setTabTitle: (input: SetTabTitleServiceInput) => Promise<void>;
  getText: (paneId: number) => Promise<string>;
};

export const createWeztermService = (context: ServiceContext): WeztermService => {
  const { weztermCli } = context.infra;

  return {
    listPanes: async (): Promise<WeztermPane[]> => {
      return await weztermCli.listPanes();
    },

    createNewTab: async (input: CreateNewTabInput): Promise<number> => {
      return await weztermCli.spawn({ cwd: input.cwd });
    },

    splitPane: async (input: SplitPaneServiceInput): Promise<number> => {
      return await weztermCli.splitPane({
        paneId: input.paneId,
        direction: input.direction,
        cwd: input.cwd,
      });
    },

    sendCommand: async (input: SendCommandInput): Promise<void> => {
      await weztermCli.sendText({
        paneId: input.paneId,
        text: `${input.command}\n`,
      });
    },

    sendText: async (input: SendTextServiceInput): Promise<void> => {
      await weztermCli.sendText({
        paneId: input.paneId,
        text: input.text,
      });
    },

    navigateToPane: async (input: NavigateToPaneInput): Promise<void> => {
      await weztermCli.activatePane(input.paneId);
    },

    setTabTitle: async (input: SetTabTitleServiceInput): Promise<void> => {
      await weztermCli.setTabTitle({ tabId: input.tabId, title: input.title });
    },

    getText: async (paneId: number): Promise<string> => {
      return await weztermCli.getText(paneId);
    },
  };
};
