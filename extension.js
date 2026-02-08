const vscode = require('vscode');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

// Constants
const MAX_FILES_IN_DIRECTORY = 1000;
const EXCLUDE_PATTERNS = '**/node_modules/**';

/**
 * Get weight from configuration
 */
function getWeight(type) {
    const config = vscode.workspace.getConfiguration('jumper.weights');
    return config.get(type);
}

/**
 * Debounce function - delays execution until after wait time has elapsed
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check if a file should be tracked in the jumper database
 */
function shouldTrackFile(filePath) {
    if (!filePath) return false;

    // Get exclude patterns from configuration
    const config = vscode.workspace.getConfiguration('jumper');
    const excludePatterns = config.get('excludePatterns', []);

    // Always exclude files with colons (temporary buffers)
    if (filePath.includes(':')) {
        return false;
    }

    return !excludePatterns.some(pattern => filePath.includes(pattern));
}

/**
 * Check if jumper is installed
 */
async function checkJumperInstalled() {
    try {
        await execAsync('which jumper');
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Update jumper database with a file or directory
 */
async function updateDatabase(pathToUpdate, weight, type = 'files') {
    if (!pathToUpdate) return;

    // Check if file should be tracked (excludes temp files, build dirs, etc)
    if (type === 'files' && !shouldTrackFile(pathToUpdate)) {
        return;
    }

    try {
        await execAsync(`jumper update --type=${type} -w ${weight} "${pathToUpdate}"`);
    } catch (error) {
        // Silently fail - don't spam console with update errors
    }
}

/**
 * Build jumper command with configuration options
 */
function buildJumperCommand(type, query = '') {
    const config = vscode.workspace.getConfiguration('jumper');
    const args = ['jumper', 'find', `--type=${type}`];

    // Add max results
    const maxResults = config.get('maxResults');
    if (maxResults !== 'no_limit') {
        args.push('-n', maxResults);
    }

    // Add flags based on configuration
    if (config.get('homeTilde')) args.push('-H');
    if (config.get('relative')) args.push('-r');

    // Add syntax
    args.push(`--syntax=${config.get('syntax')}`);

    // Add case sensitivity
    const caseSensitivity = config.get('caseSensitivity');
    if (caseSensitivity === 'sensitive') args.push('-S');
    else if (caseSensitivity === 'insensitive') args.push('-I');

    // Add query
    if (query) args.push(`"${query}"`);

    return args.join(' ');
}

/**
 * Execute jumper command and get results
 */
async function executeJumper(type, query = '') {
    const cmd = buildJumperCommand(type, query);

    try {
        const { stdout } = await execAsync(cmd);
        return stdout.trim().split('\n')
            .filter(line => line.length > 0)
            .map(line => line.trim());
    } catch (error) {
        console.error('Jumper command failed:', error);
        return [];
    }
}

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
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document, {
        preview: false,
        preserveFocus: false
    });
}

/**
 * Generic quick pick for jumper queries
 */
async function createJumperQuickPick(type, placeholder, onSelect) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = placeholder;

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


/**
 * Activate the extension
 */
function activate(context) {
    console.log('Jumper extension is now active');

    // Check if jumper is installed
    checkJumperInstalled().then(installed => {
        if (!installed) {
            vscode.window.showErrorMessage(
                'Jumper is not installed. Please follow the instructions at https://github.com/homerours/jumper'
            );
            return;
        }
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('jumper.jumpToFile', jumpToFile)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('jumper.jumpToDirectory', jumpToDirectory)
    );

    // Track file opens
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.uri.scheme === 'file') {
                updateDatabase(document.fileName, getWeight('visit'));
            }
        })
    );

    // Track file saves with different weights for manual vs auto save
    context.subscriptions.push(
        vscode.workspace.onWillSaveTextDocument(event => {
            if (event.document.uri.scheme === 'file') {
                // TextDocumentSaveReason: Manual = 1, AfterDelay = 2, FocusOut = 3
                const weight = event.reason === vscode.TextDocumentSaveReason.Manual
                    ? getWeight('manualSave')
                    : getWeight('autoSave');
                updateDatabase(event.document.fileName, weight);
            }
        })
    );

    // Track active editor changes (switching between tabs)
    // Debounced so rapid switching A -> B -> C -> D only tracks D
    const config = vscode.workspace.getConfiguration('jumper');
    const debounceDelay = config.get('debounceDelay', 500);

    const debouncedEditorUpdate = debounce((fileName) => {
        updateDatabase(fileName, getWeight('activeEditor'));
    }, debounceDelay);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor?.document.uri.scheme === 'file') {
                debouncedEditorUpdate(editor.document.fileName);
            }
        })
    );

    // Track workspace folder changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(event => {
            event.added.forEach(folder => {
                updateDatabase(folder.uri.fsPath, getWeight('visit'), 'directories');
            });
        })
    );

    // Update database with current workspace on activation
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        workspaceFolders.forEach(folder => {
            updateDatabase(folder.uri.fsPath, getWeight('visit'), 'directories');
        });
    }
}

/**
 * Deactivate the extension
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
