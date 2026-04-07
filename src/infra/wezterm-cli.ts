import { execFile, execFileSync } from "node:child_process";
import type { WeztermPane } from "../models/wezterm.ts";

export type SpawnInput = {
  cwd?: string;
  command?: string[];
};

export type SplitPaneInput = {
  paneId?: number;
  direction: "right" | "bottom";
  cwd?: string;
  command?: string[];
};

export type SendTextInput = {
  paneId: number;
  text: string;
};

export type SetTabTitleInput = {
  tabId: number;
  title: string;
};

export type WeztermCli = {
  listPanes: () => Promise<WeztermPane[]>;
  spawn: (input: SpawnInput) => Promise<number>;
  splitPane: (input: SplitPaneInput) => Promise<number>;
  sendText: (input: SendTextInput) => Promise<void>;
  activatePane: (paneId: number) => Promise<void>;
  activateTab: (tabId: number) => Promise<void>;
  setTabTitle: (input: SetTabTitleInput) => Promise<void>;
  getText: (paneId: number) => Promise<string>;
};

const resolveWeztermPath = (): string => {
  try {
    return execFileSync("which", ["wezterm"], { encoding: "utf-8" }).trim();
  } catch {
    return "wezterm";
  }
};

const weztermPath = resolveWeztermPath();

const execWeztermCli = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(weztermPath, ["cli", ...args], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`wezterm cli ${args[0]} failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });

export const createWeztermCli = (): WeztermCli => ({
  listPanes: async (): Promise<WeztermPane[]> => {
    const output = await execWeztermCli(["list", "--format", "json"]);
    return JSON.parse(output) as WeztermPane[];
  },

  spawn: async (input: SpawnInput): Promise<number> => {
    const args = ["spawn"];
    if (input.cwd) {
      args.push("--cwd", input.cwd);
    }
    if (input.command) {
      args.push("--", ...input.command);
    }
    const output = await execWeztermCli(args);
    return parseInt(output, 10);
  },

  splitPane: async (input: SplitPaneInput): Promise<number> => {
    const args = ["split-pane", `--${input.direction}`];
    if (input.paneId !== undefined) {
      args.push("--pane-id", String(input.paneId));
    }
    if (input.cwd) {
      args.push("--cwd", input.cwd);
    }
    if (input.command) {
      args.push("--", ...input.command);
    }
    const output = await execWeztermCli(args);
    return parseInt(output, 10);
  },

  sendText: async (input: SendTextInput): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const proc = execFile(
        "wezterm",
        ["cli", "send-text", "--no-paste", "--pane-id", String(input.paneId)],
        (error) => {
          if (error) {
            reject(new Error(`wezterm cli send-text failed: ${error.message}`));
            return;
          }
          resolve();
        },
      );
      proc.stdin?.write(input.text);
      proc.stdin?.end();
    });
  },

  activatePane: async (paneId: number): Promise<void> => {
    await execWeztermCli(["activate-pane", "--pane-id", String(paneId)]);
  },

  activateTab: async (tabId: number): Promise<void> => {
    await execWeztermCli(["activate-tab", "--tab-id", String(tabId)]);
  },

  setTabTitle: async (input: SetTabTitleInput): Promise<void> => {
    await execWeztermCli(["set-tab-title", "--tab-id", String(input.tabId), input.title]);
  },

  getText: async (paneId: number): Promise<string> => {
    return await execWeztermCli(["get-text", "--pane-id", String(paneId)]);
  },
});
