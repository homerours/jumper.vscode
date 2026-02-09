const vscode = require('vscode');
const path = require('path');
const { executeJumper, updateDatabase, getWeight } = require('./database');

// Constants
const MAX_FILES_IN_DIRECTORY = 1000;
const EXCLUDE_PATTERNS = '**/node_modules/**';

/**
 * Expand ~ to home directory if present
 */
function expandTilde(filePath) {
    return filePath.startsWith('~')
        ? filePath.replace('~', process.env.HOME || process.env.USERPROFILE)
        : filePath;
}

/**
 * Open a file in a new tab
 */
async function openFileInNewTab(fileUri) {
    // Check if it's a notebook file
    if (fileUri.fsPath.endsWith('.ipynb')) {
        // Open as notebook
        await vscode.commands.executeCommand('vscode.open', fileUri);
    } else {
        // Open as regular text document
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus: false
        });
    }
}

/**
 * Generic quick pick for jumper queries
 */
async function createJumperQuickPick(type, placeholder, onSelect) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = placeholder;

    // Disable VSCode's built-in filtering and sorting to preserve jumper's ranking
    quickPick.matchOnDescription = false;
    quickPick.matchOnDetail = false;
    quickPick.sortByLabel = false;

    const updateResults = async (query) => {
        quickPick.busy = true;
        const results = await executeJumper(type, query);

        quickPick.items = results.map(itemPath => ({
            label: path.basename(itemPath),
            description: itemPath,  // Keep ~ in display
            path: itemPath,         // Store original path
            alwaysShow: true
        }));
        quickPick.busy = false;
    };

    await updateResults('');

    quickPick.onDidChangeValue(async (value) => {
        await updateResults(value);
    });

    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        if (selected && selected.path) {
            quickPick.hide();
            await onSelect(selected.path);
        }
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
}

/**
 * Show quick pick for files with live jumper queries
 */
async function jumpToFile() {
    await createJumperQuickPick('files', 'Type to search files (jumper query)', async (filePath) => {
        try {
            await openFileInNewTab(vscode.Uri.file(expandTilde(filePath)));
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        }
    });
}

/**
 * Show quick pick for files in a directory
 */
async function pickFileInDirectory(dirPath) {
    const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(dirPath, '**/*'),
        EXCLUDE_PATTERNS,
        MAX_FILES_IN_DIRECTORY
    );

    if (files.length === 0) {
        vscode.window.showInformationMessage(`No files found in ${dirPath}`);
        return;
    }

    const items = files.map(fileUri => ({
        label: path.basename(fileUri.fsPath),
        description: path.relative(dirPath, fileUri.fsPath),
        fileUri: fileUri
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Select a file in ${path.basename(dirPath)}`,
        matchOnDescription: true
    });

    if (selected) {
        await openFileInNewTab(selected.fileUri);
    }
}

/**
 * Show quick pick for directories with live jumper queries
 */
async function jumpToDirectory() {
    await createJumperQuickPick('directories', 'Type to search directories (jumper query)', async (dirPath) => {
        const expandedPath = expandTilde(dirPath);
        await updateDatabase(expandedPath, getWeight('visit'), 'directories');
        await pickFileInDirectory(expandedPath);
    });
}

module.exports = {
    jumpToFile,
    jumpToDirectory
};
