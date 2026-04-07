import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useMemo, useState, type FC } from "react";
import type { DirectoryGroup } from "../../models/session.ts";
import { useScroll } from "../../hooks/use-scroll.ts";

type Props = {
  directoryGroups: DirectoryGroup[];
  currentDir: string;
  isFocused: boolean;
  availableRows: number;
  onSelect: (cwd: string) => void;
  onCursorChange: (cwd: string) => void;
};

export const sortDirectoryGroups = (
  groups: DirectoryGroup[],
  currentDir: string,
): DirectoryGroup[] => {
  const current = groups.filter((g) => g.cwd === currentDir);
  const rest = groups.filter((g) => g.cwd !== currentDir);
  return [...current, ...rest];
};

export const DirectorySelect: FC<Props> = ({
  directoryGroups,
  currentDir,
  isFocused,
  availableRows,
  onSelect,
  onCursorChange,
}) => {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);

  const sortedGroups = useMemo(
    () => sortDirectoryGroups(directoryGroups, currentDir),
    [directoryGroups, currentDir],
  );

  const directories = useMemo(() => sortedGroups.map((g) => g.cwd), [sortedGroups]);

  const clampedCursor = cursor >= directories.length ? Math.max(0, directories.length - 1) : cursor;
  if (clampedCursor !== cursor) {
    setCursor(clampedCursor);
  }

  const currentStats = useMemo(() => {
    const group = sortedGroups[clampedCursor];
    if (!group) return { claude: 0, available: 0, busy: 0 };
    const allPanes = group.tabs.flatMap((t) => t.panes);
    return {
      claude: allPanes.filter((p) => p.kind === "claude").length,
      available: allPanes.filter((p) => p.kind === "available").length,
      busy: allPanes.filter((p) => p.kind === "busy").length,
    };
  }, [sortedGroups, clampedCursor]);

  const reservedLines = 2;
  const { scrollOffset, visibleCount } = useScroll(
    clampedCursor,
    directories.length,
    availableRows - reservedLines,
  );
  const visibleDirs = directories.slice(scrollOffset, scrollOffset + visibleCount);

  const moveCursor = useCallback(
    (next: number): void => {
      const clamped = Math.max(0, Math.min(directories.length - 1, next));
      setCursor(clamped);
      const dir = directories[clamped];
      if (dir) onCursorChange(dir);
    },
    [directories, onCursorChange],
  );

  useInput(
    (input, key) => {
      if (input === "q") {
        exit();
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

      if (key.return || key.rightArrow) {
        const dir = directories[clampedCursor];
        if (dir) onSelect(dir);
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color={isFocused ? "green" : "gray"}>
          Directories
        </Text>
        <Text dimColor>
          {" "}
          ({clampedCursor + 1}/{directories.length})
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleDirs.map((dir, i) => {
          const globalIndex = scrollOffset + i;
          const isHighlighted = globalIndex === clampedCursor;
          const isCurrent = dir === currentDir;
          return (
            <Box key={dir} paddingLeft={1} gap={1}>
              <Text color={isHighlighted ? "green" : undefined}>
                {isHighlighted ? "\u25B6" : " "}
              </Text>
              <Text color={isHighlighted ? "green" : "cyan"} bold={isHighlighted} wrap="truncate">
                {dir}
              </Text>
              {isCurrent && <Text color="yellow">(now)</Text>}
            </Box>
          );
        })}
      </Box>
      <Box gap={1} paddingLeft={1}>
        {currentStats.claude > 0 && (
          <Text>
            <Text color="#FF8C00">{"\u2733"}</Text> <Text dimColor>{currentStats.claude}</Text>
          </Text>
        )}
        {currentStats.available > 0 && (
          <Text>
            <Text color="#4AA8D8">{"\u25CB"}</Text> <Text dimColor>{currentStats.available}</Text>
          </Text>
        )}
        {currentStats.busy > 0 && (
          <Text>
            <Text color="#E05252">{"\u25CF"}</Text> <Text dimColor>{currentStats.busy}</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
};
