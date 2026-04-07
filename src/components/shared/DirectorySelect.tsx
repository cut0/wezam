import { Box, Text, useApp, useInput } from "ink";
import { useMemo, useState, type FC } from "react";
import type { DirectoryGroup } from "../../models/session.ts";
import { Header } from "./Header.tsx";
import { useTerminalSize } from "../../hooks/use-terminal-size.ts";
import { useScroll } from "../../hooks/use-scroll.ts";

type Props = {
  title: string;
  directoryGroups: DirectoryGroup[];
  currentDir: string;
  onSelect: (cwd: string) => void;
};

export const DirectorySelect: FC<Props> = ({ title, directoryGroups, currentDir, onSelect }) => {
  const { exit } = useApp();
  const { rows } = useTerminalSize();
  const [cursor, setCursor] = useState(0);

  const sortedGroups = useMemo(() => {
    const current = directoryGroups.filter((g) => g.cwd === currentDir);
    const rest = directoryGroups.filter((g) => g.cwd !== currentDir);
    return [...current, ...rest];
  }, [directoryGroups, currentDir]);

  const directories = useMemo(() => sortedGroups.map((g) => g.cwd), [sortedGroups]);

  const currentStats = useMemo(() => {
    const group = sortedGroups[cursor];
    if (!group) return { claude: 0, available: 0, busy: 0 };
    const allPanes = group.tabs.flatMap((t) => t.panes);
    return {
      claude: allPanes.filter((p) => p.kind === "claude").length,
      available: allPanes.filter((p) => p.kind === "available").length,
      busy: allPanes.filter((p) => p.kind === "busy").length,
    };
  }, [sortedGroups, cursor]);

  const reservedLines = 4;
  const { scrollOffset, visibleCount } = useScroll(
    cursor,
    directories.length,
    rows - reservedLines,
  );
  const visibleDirs = directories.slice(scrollOffset, scrollOffset + visibleCount);

  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((c) => Math.min(directories.length - 1, c + 1));
      return;
    }

    if (key.return) {
      const dir = directories[cursor];
      if (dir) {
        onSelect(dir);
      }
    }
  });

  return (
    <Box flexDirection="column" height={rows}>
      <Header title={title} />
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleDirs.map((dir, i) => {
          const globalIndex = scrollOffset + i;
          const isHighlighted = globalIndex === cursor;
          const isCurrent = dir === currentDir;
          return (
            <Box key={dir} paddingLeft={1} gap={1}>
              <Text color={isHighlighted ? "green" : undefined}>
                {isHighlighted ? "\u25B6" : " "}
              </Text>
              <Text color={isHighlighted ? "green" : "cyan"} bold={isHighlighted}>
                {dir}
              </Text>
              {isCurrent && <Text color="yellow">(current)</Text>}
            </Box>
          );
        })}
      </Box>
      <Box gap={2}>
        <Text dimColor>
          Up/Down move Enter select q quit ({cursor + 1}/{directories.length})
        </Text>
        <Box gap={1}>
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
    </Box>
  );
};
