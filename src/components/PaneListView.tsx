import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import type { DirectoryGroup, UnifiedPane } from "../models/session.ts";
import { TabLabel } from "./sessions/TabHeader.tsx";
import { PaneItem } from "./sessions/PaneItem.tsx";
import { useScroll } from "../hooks/use-scroll.ts";

type RenderLine =
  | { kind: "tab"; tabId: number; tabName: string }
  | { kind: "item"; flatIndex: number };

type Props = {
  selectedDir: string;
  group: DirectoryGroup;
  initialCursor?: number;
  isFocused: boolean;
  availableRows: number;
  onNavigate: (up: UnifiedPane) => void;
  onLaunch: (up: UnifiedPane) => void;
  onHighlight: (up: UnifiedPane) => void;
  onUnhighlight: (up: UnifiedPane) => void;
  onBack: () => void;
};

export const PaneListView: FC<Props> = ({
  selectedDir,
  group,
  initialCursor,
  isFocused,
  availableRows,
  onNavigate,
  onLaunch,
  onHighlight,
  onUnhighlight,
  onBack,
}) => {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(initialCursor ?? 0);
  const highlightedRef = useRef<UnifiedPane | undefined>(undefined);

  const dirPanes = useMemo(() => group.tabs.flatMap((t) => t.panes), [group]);

  const clampedCursor = cursor >= dirPanes.length ? Math.max(0, dirPanes.length - 1) : cursor;
  if (clampedCursor !== cursor) {
    setCursor(clampedCursor);
  }

  const allLines = useMemo((): RenderLine[] => {
    const lines: RenderLine[] = [];
    let flatIndex = 0;
    for (const tab of group.tabs) {
      lines.push({ kind: "tab", tabId: tab.tabId, tabName: tab.tabName });
      for (const _ of tab.panes) {
        lines.push({ kind: "item", flatIndex });
        flatIndex += 1;
      }
    }
    return lines;
  }, [group]);

  const cursorLineIndex = useMemo(
    () => allLines.findIndex((l) => l.kind === "item" && l.flatIndex === clampedCursor),
    [allLines, clampedCursor],
  );

  const reservedLines = 1;
  const { scrollOffset, visibleCount } = useScroll(
    cursorLineIndex,
    allLines.length,
    availableRows - reservedLines,
  );
  const visibleLines = useMemo(
    () => allLines.slice(scrollOffset, scrollOffset + visibleCount),
    [allLines, scrollOffset, visibleCount],
  );

  const highlight = useCallback(
    (up: UnifiedPane | undefined): void => {
      const prev = highlightedRef.current;
      if (prev && prev !== up) onUnhighlight(prev);
      if (up) onHighlight(up);
      highlightedRef.current = up;
    },
    [onHighlight, onUnhighlight],
  );

  const clearHighlight = useCallback((): void => {
    const prev = highlightedRef.current;
    if (prev) onUnhighlight(prev);
    highlightedRef.current = undefined;
  }, [onUnhighlight]);

  const moveCursor = useCallback(
    (next: number): void => {
      const clamped = Math.max(0, Math.min(dirPanes.length - 1, next));
      setCursor(clamped);
      highlight(dirPanes[clamped]);
    },
    [dirPanes, highlight],
  );

  const didInitRef = useRef(false);
  if (!didInitRef.current && dirPanes.length > 0) {
    didInitRef.current = true;
    highlight(dirPanes[clampedCursor]);
  }

  useInput(
    (input, key) => {
      if (input === "q") {
        clearHighlight();
        exit();
        return;
      }

      if (key.escape || key.leftArrow) {
        clearHighlight();
        onBack();
        return;
      }

      if (key.upArrow) {
        moveCursor(clampedCursor - 1);
        return;
      }

      if (key.downArrow) {
        moveCursor(clampedCursor + 1);
        return;
      }

      if (input === "f") {
        const pane = dirPanes[clampedCursor];
        if (pane) onNavigate(pane);
        return;
      }

      if (key.return) {
        const up = dirPanes[clampedCursor];
        if (up?.kind === "available") {
          clearHighlight();
          onLaunch(up);
        }
      }
    },
    { isActive: isFocused },
  );

  const renderLine = (line: RenderLine, i: number): ReactNode => {
    if (line.kind === "tab") {
      return <TabLabel key={`t-${line.tabId}-${i}`} tabName={line.tabName} />;
    }
    const up = dirPanes[line.flatIndex];
    if (!up) return null;
    return (
      <PaneItem
        key={up.pane.pane_id}
        unifiedPane={up}
        isHighlighted={line.flatIndex === clampedCursor}
      />
    );
  };

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color={isFocused ? "green" : "gray"}>
          Sessions
        </Text>
        <Text dimColor>
          {" "}
          {selectedDir} ({clampedCursor + 1}/{dirPanes.length})
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleLines.map(renderLine)}
      </Box>
    </Box>
  );
};
