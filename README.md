# Jumper for VSCode

A VSCode extension for [jumper](https://github.com/homerours/jumper) to quickly navigate to frequently used files and directories with very few keystrokes.

## Features

- **Automatic tracking**: Keeps jumper's database updated by tracking opened files, saved files, and workspace changes
- **Quick navigation**: Jump to files and directories with fuzzy matching
- **Find in files**: Search within files from jumper's database
- **Configurable**: Customize ranking, syntax, and display options

## Requirements

You must have [jumper](https://github.com/homerours/jumper) installed on your system. Follow the [installation instructions](https://github.com/homerours/jumper#installation).

## Usage

### Commands

- **Jumper: Jump to File** - Open a quick pick to select and open a file from jumper's database
- **Jumper: Jump to Directory** - Open a quick pick to select and open a directory
- **Jumper: Find in Files** - Search within files from jumper's database

### Recommended Keybindings

Add these to your `keybindings.json`:

```json
{
  "key": "ctrl+u",
  "command": "jumper.jumpToFile"
},
{
  "key": "ctrl+y",
  "command": "jumper.jumpToDirectory"
},
{
  "key": "ctrl+shift+f",
  "command": "jumper.findInFiles"
}
```

## Extension Settings

This extension contributes the following settings:

- `jumper.maxResults`: Maximum number of results to show (default: 300)
- `jumper.beta`: Beta parameter for ranking algorithm (default: 1.0)
- `jumper.syntax`: Query syntax mode - "extended" or "fuzzy" (default: "extended")
- `jumper.caseSensitivity`: Case sensitivity - "default", "sensitive", or "insensitive"
- `jumper.homeTilde`: Substitute $HOME with ~/ in results (default: true)
- `jumper.relative`: Show relative paths instead of absolute (default: false)

## How it Works

The extension automatically updates jumper's database when you:
- Open a file (weight: 1.0)
- Save a file (weight: 0.3)
- Change workspace folders (weight: 1.0)

This ensures that your most frequently and recently used files and directories are always available for quick access.

## Development

To run the extension in development mode:

1. Clone the repository
2. Open in VSCode
3. Press F5 to launch Extension Development Host
4. Test the commands in the new window

## Credits

- Based on [jumper](https://github.com/homerours/jumper) by homerours
- Inspired by [jumper.nvim](https://github.com/homerours/jumper.nvim)

## License

MIT
