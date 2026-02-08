# Jumper for VSCode

Navigate to your most frequently and recently used files and directories instantly with [jumper](https://github.com/homerours/jumper)'s frecency algorithm.

<!-- Add a demo GIF here:
![Demo](demo.gif)
-->

## Why Jumper?

- 🚀 **Lightning fast** - Jump to files in milliseconds using frecency ranking
- 🧠 **Smart learning** - Automatically ranks files by frequency and recency
- 🔄 **Consistent across editors** - Same frecency database as jumper CLI and Neovim plugin
- 🎯 **Live updates** - Results update as you type, powered directly by jumper
- ⚙️ **Highly configurable** - Customize ranking, syntax, and display options

## Quick Start

### 1. Install jumper CLI

First, install the [jumper](https://github.com/homerours/jumper) command-line tool:

**macOS/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/homerours/jumper/main/install.sh | sh
```

**Or with cargo:**
```bash
cargo install jumper
```

See [jumper installation guide](https://github.com/homerours/jumper#installation) for more options.

### 2. Install the extension

Install from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=homerours.jumper-vscode) or search for "Jumper" in the Extensions view.

### 3. Start jumping!

- Press `Ctrl+Alt+U` to jump to a file
- Press `Ctrl+Alt+Y` to jump to a directory

The extension automatically learns your file access patterns as you work.

## Features

### Jump to Files (`Ctrl+Alt+U`)
Search and open files from jumper's database with live query updates. Files you use most frequently and recently appear first.

### Jump to Directories (`Ctrl+Alt+Y`)
Search for a directory, then browse and open files within it. Perfect for navigating large projects.

### Automatic Tracking
The extension automatically updates jumper's database:
- When you open a file
- When you save a file
- When you change workspace folders

### Live Query Updates
Unlike standard VSCode file pickers, queries are sent directly to jumper as you type, with no additional VSCode filtering.

## Customization

### Keybindings

**Default shortcuts:**
- `Ctrl+Alt+U` - Jump to File
- `Ctrl+Alt+Y` - Jump to Directory

**To customize:**
1. Open Keyboard Shortcuts: `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Win/Linux)
2. Search for "jumper"
3. Click a command and press your desired key

**Tip:** If you use the [Neovim plugin](https://github.com/homerours/jumper.nvim), you can set `Ctrl+U` and `Ctrl+Y` for consistency.

### Settings

Configure jumper's behavior in VSCode settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `jumper.maxResults` | `300` | Maximum number of results to show |
| `jumper.syntax` | `"extended"` | Query syntax: "extended" or "fuzzy" |
| `jumper.caseSensitivity` | `"default"` | Case sensitivity: "default", "sensitive", or "insensitive" |
| `jumper.homeTilde` | `true` | Show `~/path` instead of `/home/user/path` |
| `jumper.relative` | `false` | Show relative paths instead of absolute |
| `jumper.beta` | `1.0` | Ranking algorithm parameter |

## How It Works

Jumper uses a **frecency algorithm** (frequency + recency) to rank files and directories:

- Recently accessed items rank higher
- Frequently accessed items rank higher
- The ranking adapts to your workflow automatically

The database is shared across:
- Shell (jumper CLI)
- Neovim ([jumper.nvim](https://github.com/homerours/jumper.nvim))
- VSCode (this extension)

## Troubleshooting

### "jumper is not installed" error

Install the jumper CLI tool following the [installation guide](https://github.com/homerours/jumper#installation).

### No results showing

The database builds over time as you use it. Try opening some files first, or use jumper in your shell to populate it faster.

### Keybindings not working

The default shortcuts may conflict with other extensions. Check Keyboard Shortcuts (`Cmd/Ctrl+K Cmd/Ctrl+S`) and customize as needed.

## Related Projects

- [jumper](https://github.com/homerours/jumper) - The core CLI tool
- [jumper.nvim](https://github.com/homerours/jumper.nvim) - Neovim plugin

## Credits

Created by [homerours](https://github.com/homerours). Inspired by [z](https://github.com/rupa/z) and other frecency tools.

## License

MIT
