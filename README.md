# wezam

A terminal UI for managing Claude Code sessions on WezTerm. Browse active sessions, detect their status in real-time, and launch new ones from a single interactive interface.

## Features

- List and navigate WezTerm panes grouped by directory and tab
- Detect Claude session status: waiting for input, thinking, running tools, idle
- Launch new Claude Code sessions with prompts via your `$EDITOR`
- Highlight active sessions in WezTerm tab titles
- Auto-refresh pane status every 3 seconds

## Requirements

- Node.js >= 24
- pnpm >= 10
- [WezTerm](https://wezfurlong.org/wezterm/) with CLI enabled (`wezterm cli` must be available in your PATH)

## Install

From npm:

```sh
pnpm add -g wezam@0.1.2
```

From source:

```sh
git clone https://github.com/cut0/claude-armor.git
cd claude-armor
pnpm install
pnpm build
```

## Usage

```sh
wezam
```

This opens the interactive TUI. Use arrow keys to navigate directories, tabs, and panes. Press Enter to activate a pane or launch a new Claude Code session.

## Development

```sh
pnpm install
pnpm start        # Run in development mode (tsx)
pnpm test         # Run tests with Vitest
pnpm typecheck    # Type check without emitting
pnpm lint:check   # Lint with oxlint
pnpm format:check # Check formatting with oxfmt
pnpm build        # Bundle with esbuild
```

## Dependencies

| Package | Version |
| --- | --- |
| ink | 6.8.0 |
| @inkjs/ui | 2.0.0 |
| react | 19.2.4 |

## License

MIT
