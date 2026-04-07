import { Box, Text } from "ink";
import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import type { DirectoryGroup, UnifiedPane } from "../models/session.ts";
import { Header } from "./shared/Header.tsx";
import { StatusBar } from "./shared/StatusBar.tsx";
import { DirectorySelect, sortDirectoryGroups } from "./shared/DirectorySelect.tsx";
import { PaneListView } from "./PaneListView.tsx";
import { ConfirmView } from "./ConfirmView.tsx";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";

const MODE = {
  split: "split",
  confirm: "confirm",
} as const;

type Mode = (typeof MODE)[keyof typeof MODE];

const FOCUS = {
  left: "left",
  right: "right",
} as const;

type Focus = (typeof FOCUS)[keyof typeof FOCUS];

type RestoredState = {
  mode: Mode;
  selectedDir?: string;
  cursor: number;
  focus?: Focus;
  pendingPane?: UnifiedPane;
  pendingPrompt?: string;
};

type Props = {
  initialDirectoryGroups: DirectoryGroup[];
  isLoading: boolean;
  error?: string;
  currentDir: string;
  restoredState?: RestoredState;
  onRefresh: () => Promise<DirectoryGroup[]>;
  onNavigate: (up: UnifiedPane) => void;
  onEditPrompt: (up: UnifiedPane) => string | undefined;
  onConfirmLaunch: (up: UnifiedPane, prompt: string, useWorktree: boolean) => void;
  onHighlight: (up: UnifiedPane) => void;
  onUnhighlight: (up: UnifiedPane) => void;
};

const POLL_INTERVAL = 3000;

export const ManagerView: FC<Props> = ({
  initialDirectoryGroups,
  isLoading,
  error,
  currentDir,
  restoredState,
  onRefresh,
  onNavigate,
  onEditPrompt,
  onConfirmLaunch,
  onHighlight,
  onUnhighlight,
}) => {
  const { rows, columns } = useTerminalSize();
  const [directoryGroups, setDirectoryGroups] = useState(initialDirectoryGroups);
  const [mode, setMode] = useState<Mode>(restoredState?.mode ?? MODE.split);
  const [focus, setFocus] = useState<Focus>(restoredState?.focus ?? FOCUS.left);

  const initialDir = useMemo((): string | undefined => {
    if (restoredState?.selectedDir) return restoredState.selectedDir;
    const sorted = sortDirectoryGroups(initialDirectoryGroups, currentDir);
    return sorted[0]?.cwd;
  }, []);

  const [selectedDir, setSelectedDir] = useState<string | undefined>(initialDir);
  const [paneListCursor, setPaneListCursor] = useState(restoredState?.cursor ?? 0);
  const [pendingPane, setPendingPane] = useState<UnifiedPane | undefined>(
    restoredState?.pendingPane,
  );
  const [pendingPrompt, setPendingPrompt] = useState<string>(restoredState?.pendingPrompt ?? "");
  const [useWorktree, setUseWorktree] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      void onRefresh()
        .then((groups) => {
          setDirectoryGroups(groups);
        })
        .catch(() => {});
    }, POLL_INTERVAL);
    return (): void => {
      clearInterval(timer);
    };
  }, [onRefresh]);

  const selectedGroup = useMemo(
    () => directoryGroups.find((g) => g.cwd === selectedDir),
    [directoryGroups, selectedDir],
  );

  const handleDirCursorChange = useCallback((cwd: string): void => {
    setSelectedDir(cwd);
    setPaneListCursor(0);
  }, []);

  const handleDirSelect = useCallback((cwd: string): void => {
    setSelectedDir(cwd);
    setPaneListCursor(0);
    setFocus(FOCUS.right);
  }, []);

  const handleBackToDir = useCallback((): void => {
    setFocus(FOCUS.left);
  }, []);

  const handleLaunch = useCallback(
    (up: UnifiedPane): void => {
      const prompt = onEditPrompt(up);
      if (!prompt) return;
      setPendingPane(up);
      setPendingPrompt(prompt);
      setMode(MODE.confirm);
    },
    [onEditPrompt],
  );

  const handleToggleWorktree = useCallback((): void => {
    setUseWorktree((prev) => !prev);
  }, []);

  const handleConfirm = useCallback((): void => {
    if (!pendingPane) return;
    onConfirmLaunch(pendingPane, pendingPrompt, useWorktree);
    setPendingPane(undefined);
    setPendingPrompt("");
    setMode(MODE.split);
    setFocus(FOCUS.right);
  }, [pendingPane, pendingPrompt, useWorktree, onConfirmLaunch]);

  const handleCancelConfirm = useCallback((): void => {
    setPendingPane(undefined);
    setPendingPrompt("");
    setMode(MODE.split);
    setFocus(FOCUS.right);
  }, []);

  if (isLoading) {
    return (
      <Box flexDirection="column" height={rows}>
        <Header title="WezTerm AI Manager" />
        <StatusBar message="Loading..." type="info" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" height={rows}>
        <Header title="WezTerm AI Manager" />
        <StatusBar message={`Error: ${error}`} type="error" />
      </Box>
    );
  }

  if (directoryGroups.length === 0) {
    return (
      <Box flexDirection="column" height={rows}>
        <Header title="WezTerm AI Manager" />
        <StatusBar message="No Wezterm panes found" type="info" />
      </Box>
    );
  }

  if (mode === MODE.confirm && pendingPane) {
    return (
      <ConfirmView
        selectedDir={selectedDir ?? ""}
        pane={pendingPane}
        prompt={pendingPrompt}
        useWorktree={useWorktree}
        onToggleWorktree={handleToggleWorktree}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    );
  }

  const panelHeight = rows - 5;
  const leftWidth = Math.floor(columns / 3);
  const rightWidth = columns - leftWidth;

  return (
    <Box flexDirection="column" height={rows}>
      <Header title="WezTerm AI Manager" />
      <Box flexDirection="row" flexGrow={1}>
        <Box
          flexDirection="column"
          width={leftWidth}
          borderStyle="round"
          borderColor={focus === FOCUS.left ? "green" : "gray"}
        >
          <DirectorySelect
            directoryGroups={directoryGroups}
            currentDir={currentDir}
            isFocused={focus === FOCUS.left}
            availableRows={panelHeight}
            onSelect={handleDirSelect}
            onCursorChange={handleDirCursorChange}
          />
        </Box>
        <Box
          flexDirection="column"
          width={rightWidth}
          borderStyle="round"
          borderColor={focus === FOCUS.right ? "green" : "gray"}
        >
          {selectedGroup ? (
            <PaneListView
              key={selectedDir}
              selectedDir={selectedDir ?? ""}
              group={selectedGroup}
              initialCursor={paneListCursor}
              isFocused={focus === FOCUS.right}
              availableRows={panelHeight}
              onNavigate={onNavigate}
              onLaunch={handleLaunch}
              onHighlight={onHighlight}
              onUnhighlight={onUnhighlight}
              onBack={handleBackToDir}
            />
          ) : (
            <Box paddingLeft={1}>
              <Text dimColor>No sessions</Text>
            </Box>
          )}
        </Box>
      </Box>
      <Text dimColor>
        {focus === FOCUS.left
          ? "\u2191/\u2193 move  Enter/\u2192 select  q quit"
          : "\u2191/\u2193 move  Enter launch  f focus  Esc/\u2190 back  q quit"}
      </Text>
    </Box>
  );
};
