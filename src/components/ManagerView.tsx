import { Box } from "ink";
import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import type { DirectoryGroup, UnifiedPane } from "../models/session.ts";
import { Header } from "./shared/Header.tsx";
import { StatusBar } from "./shared/StatusBar.tsx";
import { DirectorySelect } from "./shared/DirectorySelect.tsx";
import { PaneListView } from "./PaneListView.tsx";
import { ConfirmView } from "./ConfirmView.tsx";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";

const MODE = {
  dirSelect: "dir-select",
  paneSelect: "pane-select",
  confirm: "confirm",
} as const;

type Mode = (typeof MODE)[keyof typeof MODE];

type RestoredState = {
  mode: Mode;
  selectedDir?: string;
  cursor: number;
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
  const { rows } = useTerminalSize();
  const [directoryGroups, setDirectoryGroups] = useState(initialDirectoryGroups);
  const [mode, setMode] = useState<Mode>(restoredState?.mode ?? MODE.dirSelect);
  const [selectedDir, setSelectedDir] = useState<string | undefined>(restoredState?.selectedDir);
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
    return () => clearInterval(timer);
  }, [onRefresh]);

  const selectedGroup = useMemo(
    () => directoryGroups.find((g) => g.cwd === selectedDir),
    [directoryGroups, selectedDir],
  );

  const handleDirSelect = useCallback((cwd: string) => {
    setSelectedDir(cwd);
    setPaneListCursor(0);
    setMode(MODE.paneSelect);
  }, []);

  const handleBackToDir = useCallback(() => {
    setSelectedDir(undefined);
    setPaneListCursor(0);
    setMode(MODE.dirSelect);
  }, []);

  const handleLaunch = useCallback(
    (up: UnifiedPane) => {
      const prompt = onEditPrompt(up);
      if (!prompt) return;
      setPendingPane(up);
      setPendingPrompt(prompt);
      setMode(MODE.confirm);
    },
    [onEditPrompt],
  );

  const handleToggleWorktree = useCallback(() => {
    setUseWorktree((prev) => !prev);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pendingPane) return;
    onConfirmLaunch(pendingPane, pendingPrompt, useWorktree);
    setPendingPane(undefined);
    setPendingPrompt("");
    setMode(MODE.paneSelect);
  }, [pendingPane, pendingPrompt, useWorktree, onConfirmLaunch]);

  const handleCancelConfirm = useCallback(() => {
    setPendingPane(undefined);
    setPendingPrompt("");
    setMode(MODE.paneSelect);
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

  if (mode === MODE.dirSelect) {
    if (directoryGroups.length === 0) {
      return (
        <Box flexDirection="column" height={rows}>
          <Header title="WezTerm AI Manager" />
          <StatusBar message="No Wezterm panes found" type="info" />
        </Box>
      );
    }
    return (
      <DirectorySelect
        title="WezTerm AI Manager"
        directoryGroups={directoryGroups}
        currentDir={currentDir}
        onSelect={handleDirSelect}
      />
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

  if (!selectedGroup) {
    setMode(MODE.dirSelect);
    return null;
  }

  return (
    <PaneListView
      key={selectedDir}
      selectedDir={selectedDir ?? ""}
      group={selectedGroup}
      initialCursor={paneListCursor}
      onNavigate={onNavigate}
      onLaunch={handleLaunch}
      onHighlight={onHighlight}
      onUnhighlight={onUnhighlight}
      onBack={handleBackToDir}
    />
  );
};
