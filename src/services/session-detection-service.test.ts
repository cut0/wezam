import { describe, it, expect, beforeEach } from "vitest";
import {
  createSessionDetectionService,
  type SessionDetectionService,
} from "./session-detection-service.ts";
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

describe("createSessionDetectionService", () => {
  let service: SessionDetectionService;

  beforeEach(() => {
    service = createSessionDetectionService();
  });

  describe("groupByDirectory", () => {
    it("ペインを UnifiedPane に変換してディレクトリ > タブでグループ化する", () => {
      const panes = [
        mockPane({ title: "\u2733 API実装", pane_id: 1, tab_id: 0, cwd: "file:///project-a" }),
        mockPane({ title: "zsh", pane_id: 2, tab_id: 0, cwd: "file:///project-a" }),
        mockPane({ title: "nvim", pane_id: 3, tab_id: 0, cwd: "file:///project-a" }),
      ];
      const result = service.groupByDirectory({ panes });
      expect(result).toHaveLength(1);
      expect(result[0].tabs[0].panes).toHaveLength(3);
      expect(result[0].tabs[0].panes[0].kind).toBe("claude");
      expect(result[0].tabs[0].panes[0].claudeTitle).toBe("API実装");
      expect(result[0].tabs[0].panes[1].kind).toBe("available");
      expect(result[0].tabs[0].panes[2].kind).toBe("busy");
    });

    it("Braille prefix のペインを claude として分類する", () => {
      const panes = [
        mockPane({ title: "\u2810 タスク", pane_id: 1, tab_id: 0, cwd: "file:///project" }),
      ];
      const result = service.groupByDirectory({ panes });
      expect(result[0].tabs[0].panes[0].kind).toBe("claude");
      expect(result[0].tabs[0].panes[0].claudeStatus).toBe("thinking");
    });

    it("同じディレクトリの複数タブをまとめる", () => {
      const panes = [
        mockPane({ title: "zsh", pane_id: 1, tab_id: 0, cwd: "file:///project" }),
        mockPane({ title: "zsh", pane_id: 2, tab_id: 3, cwd: "file:///project" }),
      ];
      const result = service.groupByDirectory({ panes });
      expect(result).toHaveLength(1);
      expect(result[0].tabs).toHaveLength(2);
    });

    it("pane_id 昇順でソートされる", () => {
      const panes = [
        mockPane({ title: "zsh", pane_id: 30, tab_id: 0, cwd: "file:///project" }),
        mockPane({ title: "zsh", pane_id: 10, tab_id: 0, cwd: "file:///project" }),
      ];
      const result = service.groupByDirectory({ panes });
      expect(result[0].tabs[0].panes[0].pane.pane_id).toBe(10);
      expect(result[0].tabs[0].panes[1].pane.pane_id).toBe(30);
    });

    it("空のペインリストでは空配列を返す", () => {
      expect(service.groupByDirectory({ panes: [] })).toHaveLength(0);
    });
  });

  describe("detectStatusFromText", () => {
    it("確認プロンプトが表示されている場合、確認待ちを返す", () => {
      expect(service.detectStatusFromText("Do you want to proceed?\nEsc to cancel")).toBe(
        "waiting-confirm",
      );
    });

    it("Running… が表示されている場合、ツール実行中を返す", () => {
      expect(service.detectStatusFromText("Bash(ls)\n  Running\u2026")).toBe("tool-running");
    });

    it("ろーでぃんぐ が表示されている場合、思考中を返す", () => {
      expect(service.detectStatusFromText("\u2733 ろーでぃんぐ\u2026 (10s)")).toBe("thinking");
    });

    it("❯ プロンプトが表示されている場合、入力待ちを返す", () => {
      expect(service.detectStatusFromText("Done\n\u2770 \n-- INSERT --")).toBe("waiting-input");
    });

    it("判定できない場合は待機中を返す", () => {
      expect(service.detectStatusFromText("some output")).toBe("idle");
    });
  });
});
