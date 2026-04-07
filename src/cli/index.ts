import { render } from "ink";
import { createElement } from "react";
import { createInfra } from "../infra/index.ts";
import { createServices } from "../services/index.ts";
import { createUsecases } from "../usecases/index.ts";
import { ManagerView } from "../components/ManagerView.tsx";
import type { DirectoryGroup, UnifiedPane } from "../models/session.ts";

const fetchDirectoryGroups = async (
  usecases: ReturnType<typeof createUsecases>,
): Promise<DirectoryGroup[]> => {
  const result = await usecases.manager.list();
  return await Promise.all(
    result.directoryGroups.map(async (dirGroup) => ({
      cwd: dirGroup.cwd,
      tabs: await Promise.all(
        dirGroup.tabs.map(async (tab) => ({
          tabId: tab.tabId,
          tabName: tab.tabName,
          panes: await Promise.all(tab.panes.map((up) => usecases.manager.enrichStatus(up))),
        })),
      ),
    })),
  );
};

type RestoredState = {
  mode: "dir-select" | "pane-select" | "confirm";
  selectedDir?: string;
  cursor: number;
  pendingPane?: UnifiedPane;
  pendingPrompt?: string;
};

const main = async (): Promise<void> => {
  const infra = createInfra();
  const services = createServices({ infra });
  const usecases = createUsecases({ services, infra });

  let initialGroups: DirectoryGroup[] = [];
  let isLoading = true;
  let error: string | undefined;

  try {
    initialGroups = await fetchDirectoryGroups(usecases);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  } finally {
    isLoading = false;
  }

  let instance: ReturnType<typeof render>;
  let restored: RestoredState | undefined;

  const handleRefresh = async (): Promise<DirectoryGroup[]> => {
    return await fetchDirectoryGroups(usecases);
  };

  const handleNavigate = (up: UnifiedPane): void => {
    void usecases.manager.navigateTo(up);
  };

  const handleEditPrompt = (up: UnifiedPane): string | undefined => {
    const currentDir = up.pane.cwd;
    const dirPanes = initialGroups.find((g) => {
      const formatted = formatCwd(g.cwd);
      return (
        formatted === formatCwd(currentDir) ||
        g.tabs.some((t) => t.panes.some((p) => p.pane.pane_id === up.pane.pane_id))
      );
    });

    const selectedDir = dirPanes?.cwd;
    const allPanes = dirPanes?.tabs.flatMap((t) => t.panes) ?? [];
    const cursorIndex = allPanes.findIndex((p) => p.pane.pane_id === up.pane.pane_id);

    instance.unmount();
    const prompt = infra.editor.open();

    if (!prompt) {
      restored = {
        mode: "pane-select",
        selectedDir,
        cursor: cursorIndex >= 0 ? cursorIndex : 0,
      };
      instance = renderApp();
      return undefined;
    }

    restored = {
      mode: "confirm",
      selectedDir,
      cursor: cursorIndex >= 0 ? cursorIndex : 0,
      pendingPane: up,
      pendingPrompt: prompt,
    };
    instance = renderApp();
    return prompt;
  };

  const handleConfirmLaunch = (up: UnifiedPane, prompt: string): void => {
    void usecases.manager.launchClaude(up, prompt);
  };

  const handleHighlight = async (up: UnifiedPane): Promise<void> => {
    await usecases.manager.highlightTab(up);
  };

  const handleUnhighlight = async (up: UnifiedPane): Promise<void> => {
    await usecases.manager.unhighlightTab(up);
  };

  const renderApp = (): ReturnType<typeof render> => {
    const r = restored;
    restored = undefined;
    return render(
      createElement(ManagerView, {
        initialDirectoryGroups: initialGroups,
        isLoading,
        error,
        currentDir: formatCwd(process.cwd()),
        restoredState: r,
        onRefresh: handleRefresh,
        onNavigate: handleNavigate,
        onEditPrompt: handleEditPrompt,
        onConfirmLaunch: handleConfirmLaunch,
        onHighlight: handleHighlight,
        onUnhighlight: handleUnhighlight,
      }),
    );
  };

  instance = renderApp();
  await instance.waitUntilExit();
};

const formatCwd = (cwd: string): string => {
  const prefix = "file://";
  const path = cwd.startsWith(prefix) ? cwd.slice(prefix.length) : cwd;
  const home = process.env["HOME"] ?? "";
  if (home && path.startsWith(home)) {
    return `~${path.slice(home.length)}`;
  }
  return path;
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
