import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWeztermService, type WeztermService } from "./wezterm-service.ts";
import type { WeztermCli } from "../infra/wezterm-cli.ts";
import type { Infra } from "../infra/index.ts";

const createMockWeztermCli = (): ReturnType<typeof vi.fn> & WeztermCli =>
  ({
    listPanes: vi.fn().mockResolvedValue([]),
    spawn: vi.fn().mockResolvedValue(10),
    splitPane: vi.fn().mockResolvedValue(11),
    sendText: vi.fn().mockResolvedValue(undefined),
    activatePane: vi.fn().mockResolvedValue(undefined),
    activateTab: vi.fn().mockResolvedValue(undefined),
    setTabTitle: vi.fn().mockResolvedValue(undefined),
    getText: vi.fn().mockResolvedValue("some text"),
  }) as never;

describe("createWeztermService", () => {
  let mockCli: WeztermCli;
  let service: WeztermService;

  beforeEach(() => {
    mockCli = createMockWeztermCli();
    const infra: Infra = { weztermCli: mockCli, editor: { open: () => undefined } };
    service = createWeztermService({ infra });
  });

  describe("listPanes", () => {
    it("weztermCli.listPanes を呼び出してペイン一覧を返す", async () => {
      const panes = [{ pane_id: 1 }];
      vi.mocked(mockCli.listPanes).mockResolvedValue(panes as never);
      const result = await service.listPanes();
      expect(result).toBe(panes);
      expect(mockCli.listPanes).toHaveBeenCalledOnce();
    });
  });

  describe("createNewTab", () => {
    it("weztermCli.spawn を cwd 付きで呼び出す", async () => {
      const result = await service.createNewTab({ cwd: "/project" });
      expect(result).toBe(10);
      expect(mockCli.spawn).toHaveBeenCalledWith({ cwd: "/project" });
    });

    it("cwd なしで呼び出せる", async () => {
      const result = await service.createNewTab({});
      expect(result).toBe(10);
      expect(mockCli.spawn).toHaveBeenCalledWith({ cwd: undefined });
    });
  });

  describe("splitPane", () => {
    it("方向とペインIDを指定して weztermCli.splitPane を呼び出す", async () => {
      const result = await service.splitPane({ direction: "right", paneId: 5 });
      expect(result).toBe(11);
      expect(mockCli.splitPane).toHaveBeenCalledWith({
        paneId: 5,
        direction: "right",
        cwd: undefined,
      });
    });

    it("下方向に分割できる", async () => {
      await service.splitPane({ direction: "bottom" });
      expect(mockCli.splitPane).toHaveBeenCalledWith({
        paneId: undefined,
        direction: "bottom",
        cwd: undefined,
      });
    });
  });

  describe("sendCommand", () => {
    it("コマンド末尾に改行を付与して weztermCli.sendText を呼び出す", async () => {
      await service.sendCommand({ paneId: 3, command: "ls -la" });
      expect(mockCli.sendText).toHaveBeenCalledWith({
        paneId: 3,
        text: "ls -la\n",
      });
    });
  });

  describe("navigateToPane", () => {
    it("activatePane を呼び出す", async () => {
      await service.navigateToPane({ paneId: 5, tabId: 2 });
      expect(mockCli.activatePane).toHaveBeenCalledWith(5);
    });
  });

  describe("setTabTitle", () => {
    it("weztermCli.setTabTitle を呼び出す", async () => {
      await service.setTabTitle({ tabId: 2, title: "\u25B6 Task" });
      expect(mockCli.setTabTitle).toHaveBeenCalledWith({ tabId: 2, title: "\u25B6 Task" });
    });
  });

  describe("getText", () => {
    it("weztermCli.getText を呼び出してペイン内容を返す", async () => {
      vi.mocked(mockCli.getText).mockResolvedValue("pane content");
      const result = await service.getText(5);
      expect(result).toBe("pane content");
      expect(mockCli.getText).toHaveBeenCalledWith(5);
    });
  });
});
