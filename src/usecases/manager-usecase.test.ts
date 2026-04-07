import { describe, it, expect, beforeEach, vi } from "vitest";
import { createManagerUsecase, type ManagerUsecase } from "./manager-usecase.ts";
import type { WeztermService } from "../services/wezterm-service.ts";
import type { SessionDetectionService } from "../services/session-detection-service.ts";
import type { Infra } from "../infra/index.ts";
import type { UnifiedPane } from "../models/session.ts";
import type { WeztermPane } from "../models/wezterm.ts";

const mockPane = (overrides: Partial<WeztermPane> = {}): WeztermPane => ({
  window_id: 0,
  tab_id: 0,
  pane_id: 0,
  workspace: "default",
  size: { rows: 24, cols: 80, pixel_width: 640, pixel_height: 384, dpi: 72 },
  title: "zsh",
  cwd: "file:///home/user",
  cursor_x: 0,
  cursor_y: 0,
  cursor_shape: "Default",
  cursor_visibility: "Visible",
  left_col: 0,
  top_row: 0,
  tab_title: "",
  window_title: "",
  is_active: false,
  is_zoomed: false,
  tty_name: "/dev/ttys000",
  ...overrides,
});

const mockUnifiedPane = (overrides: Partial<UnifiedPane> = {}): UnifiedPane => ({
  pane: mockPane({ pane_id: 5, tab_id: 2 }),
  kind: "available",
  ...overrides,
});

const createMockWeztermService = (): WeztermService => ({
  listPanes: vi.fn().mockResolvedValue([]),
  createNewTab: vi.fn().mockResolvedValue(10),
  splitPane: vi.fn().mockResolvedValue(11),
  sendCommand: vi.fn().mockResolvedValue(undefined),
  sendText: vi.fn().mockResolvedValue(undefined),
  navigateToPane: vi.fn().mockResolvedValue(undefined),
  setTabTitle: vi.fn().mockResolvedValue(undefined),
  getText: vi.fn().mockResolvedValue(""),
});

const createMockSessionDetectionService = (): SessionDetectionService => ({
  groupByDirectory: vi.fn().mockReturnValue([]),
  detectStatusFromText: vi.fn().mockReturnValue("waiting-input"),
});

describe("createManagerUsecase", () => {
  let mockWezterm: WeztermService;
  let mockSessionDetection: SessionDetectionService;
  let usecase: ManagerUsecase;

  beforeEach(() => {
    mockWezterm = createMockWeztermService();
    mockSessionDetection = createMockSessionDetectionService();
    usecase = createManagerUsecase({
      services: { wezterm: mockWezterm, sessionDetection: mockSessionDetection },
      infra: {} as Infra,
    });
  });

  describe("list", () => {
    it("ペイン一覧を取得してディレクトリグループを返す", async () => {
      const panes = [mockPane()];
      const groups = [
        { cwd: "/project", tabs: [{ tabId: 0, tabName: "zsh", panes: [mockUnifiedPane()] }] },
      ];
      vi.mocked(mockWezterm.listPanes).mockResolvedValue(panes);
      vi.mocked(mockSessionDetection.groupByDirectory).mockReturnValue(groups);

      const result = await usecase.list();
      expect(result.directoryGroups).toBe(groups);
      expect(mockWezterm.listPanes).toHaveBeenCalledOnce();
    });
  });

  describe("enrichStatus", () => {
    it("claude ペインのステータスを get-text で詳細化する", async () => {
      const up = mockUnifiedPane({ kind: "claude", claudeStatus: "tool-running" });
      vi.mocked(mockWezterm.getText).mockResolvedValue("something\n❯ \n-- INSERT --");
      vi.mocked(mockSessionDetection.detectStatusFromText).mockReturnValue("waiting-input");

      const result = await usecase.enrichStatus(up);
      expect(result.claudeStatus).toBe("waiting-input");
    });

    it("claude 以外のペインはそのまま返す", async () => {
      const up = mockUnifiedPane({ kind: "available" });
      const result = await usecase.enrichStatus(up);
      expect(result).toBe(up);
      expect(mockWezterm.getText).not.toHaveBeenCalled();
    });
  });

  describe("navigateTo", () => {
    it("対象ペインにナビゲートする", async () => {
      const up = mockUnifiedPane({ pane: mockPane({ pane_id: 8, tab_id: 3 }) });
      await usecase.navigateTo(up);
      expect(mockWezterm.navigateToPane).toHaveBeenCalledWith({ paneId: 8, tabId: 3 });
    });
  });

  describe("launchClaude", () => {
    it("worktree 有効時は -w フラグ付きで起動する", async () => {
      const up = mockUnifiedPane({ pane: mockPane({ pane_id: 7, tab_id: 2 }) });
      await usecase.launchClaude(up, "テスト", { useWorktree: true });
      expect(mockWezterm.sendCommand).toHaveBeenCalledWith({
        paneId: 7,
        command: "claude -w -- 'テスト'",
      });
      expect(mockWezterm.navigateToPane).not.toHaveBeenCalled();
    });

    it("worktree 無効時は -w フラグなしで起動する", async () => {
      const up = mockUnifiedPane({ pane: mockPane({ pane_id: 7, tab_id: 2 }) });
      await usecase.launchClaude(up, "テスト", { useWorktree: false });
      expect(mockWezterm.sendCommand).toHaveBeenCalledWith({
        paneId: 7,
        command: "claude 'テスト'",
      });
    });

    it("プロンプト内のシェル特殊文字がエスケープされる", async () => {
      const up = mockUnifiedPane({ pane: mockPane({ pane_id: 7 }) });
      await usecase.launchClaude(up, "it's a $test", { useWorktree: true });
      expect(mockWezterm.sendCommand).toHaveBeenCalledWith({
        paneId: 7,
        command: "claude -w -- 'it'\\''s a $test'",
      });
    });
  });

  describe("highlightTab", () => {
    it("タブタイトルに ▶ マーカーを設定する", async () => {
      const up = mockUnifiedPane({
        pane: mockPane({ tab_id: 4 }),
        claudeTitle: "API実装",
      });
      await usecase.highlightTab(up);
      expect(mockWezterm.setTabTitle).toHaveBeenCalledWith({ tabId: 4, title: "▶ API実装" });
    });
  });

  describe("unhighlightTab", () => {
    it("タブタイトルを空文字に戻す", async () => {
      const up = mockUnifiedPane({ pane: mockPane({ tab_id: 4 }) });
      await usecase.unhighlightTab(up);
      expect(mockWezterm.setTabTitle).toHaveBeenCalledWith({ tabId: 4, title: "" });
    });
  });
});
