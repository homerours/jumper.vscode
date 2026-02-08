# Change Log

All notable changes to the "jumper-vscode" extension will be documented in this file.

## [0.1.0] - Initial Release

### Added
- Jump to File command with quick pick interface
- Jump to Directory command to switch workspace folders
- Find in Files command to search within jumper's database
- Automatic database updates on:
  - File open (weight: 1.0)
  - File save (weight: 0.3)
  - Workspace folder changes (weight: 1.0)
- Configuration options for:
  - Maximum results
  - Beta parameter
  - Syntax mode (extended/fuzzy)
  - Case sensitivity
  - Path display (home tilde, relative paths)

### Features
- Tracks frequently and recently used files/directories
- Integrates with jumper CLI for consistent experience across editors
- Compatible with existing jumper database from shell and Neovim
