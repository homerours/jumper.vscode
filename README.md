# Jumper for VSCode

A VSCode extension for [jumper](https://github.com/homerours/jumper) to quickly navigate to frequently used files and directories with very few keystrokes.

## Features

- **Automatic tracking**: Keeps jumper's database updated by tracking opened files, saved files, and workspace changes
- **Quick navigation**: Jump to files and directories with live fuzzy matching powered by jumper's frecency algorithm
- **No VSCode filtering**: Results come directly from jumper without additional filtering
- **Configurable**: Customize ranking, syntax, and display options

## Requirements

You must have [jumper](https://github.com/homerours/jumper) installed on your system. Follow the [installation instructions](https://github.com/homerours/jumper#installation).

## Usage

### Commands

- **Jumper: Jump to File** (`Ctrl+Alt+U`) - Search and open files from jumper's database with live query updates
- **Jumper: Jump to Directory** (`Ctrl+Alt+Y`) - Search directories, then browse files within the selected directory

### Keybindings

The extension provides default keybindings:
- **`Ctrl+Alt+U`** - Jump to File
- **`Ctrl+Alt+Y`** - Jump to Directory

#### Customizing Keybindings

To change the default keybindings (e.g., to use `Ctrl+U` and `Ctrl+Y` like the Neovim plugin):

**Using the UI (recommended):**

1. Open Keyboard Shortcuts: `Cmd+K Cmd+S` (macOS) or `Ctrl+K Ctrl+S` (Windows/Linux)
2. Search for "jumper" to find the commands
3. Click on a command and press your desired key combination
4. If the key is already used, VSCode will warn you - you can choose to override it

**Example: Setting Ctrl+U for Jump to File**
1. Search for "Jumper: Jump to File"
2. Click the pencil icon or the keybinding
3. Press `Ctrl+U`
4. Press Enter to confirm
5. Repeat for "Jumper: Jump to Directory" with `Ctrl+Y`

**Note**: Using `Ctrl+U` and `Ctrl+Y` will override VSCode's built-in shortcuts (scroll up and redo).

## Extension Settings

This extension contributes the following settings:

- `jumper.maxResults`: Maximum number of results to show (default: 300)
- `jumper.beta`: Beta parameter for ranking algorithm (default: 1.0)
- `jumper.syntax`: Query syntax mode - "extended" or "fuzzy" (default: "extended")
- `jumper.caseSensitivity`: Case sensitivity - "default", "sensitive", or "insensitive"
- `jumper.homeTilde`: Substitute $HOME with ~/ in results (default: true)
- `jumper.relative`: Show relative paths instead of absolute (default: false)
