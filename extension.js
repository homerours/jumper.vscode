const vscode = require('vscode');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

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
async function updateDatabase(pathToUpdate, weight) {
    if (!pathToUpdate) return;

    // Exclude git files and paths with colons (temporary buffers)
    if (pathToUpdate.includes('/.git/') || pathToUpdate.includes(':')) {
        return;
    }

    try {
        await execAsync(`jumper update --type=files -w ${weight} "${pathToUpdate}"`);
    } catch (error) {
        // Silently fail - don't spam console with update errors
    }
}

/**
 * Strip ANSI color codes from a string
 */
function stripAnsiCodes(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Build jumper command with configuration options
 */
function buildJumperCommand(type, query = '') {
    const config = vscode.workspace.getConfiguration('jumper');

    let cmd = `jumper find --type=${type}`;

    const maxResults = config.get('maxResults');
    if (maxResults !== 'no_limit') {
        cmd += ` -n ${maxResults}`;
    }

    // Never use -c flag (no color highlighting)

    if (config.get('homeTilde')) {
        cmd += ' -H';
    }

    if (config.get('relative')) {
        cmd += ' -r';
    }

    const syntax = config.get('syntax');
    cmd += ` --syntax=${syntax}`;

    const caseSensitivity = config.get('caseSensitivity');
    if (caseSensitivity === 'sensitive') {
        cmd += ' -S';
    } else if (caseSensitivity === 'insensitive') {
        cmd += ' -I';
    }

    if (query) {
        cmd += ` "${query}"`;
    }

    return cmd;
}

/**
 * Execute jumper command and get results
 */
async function executeJumper(type, query = '') {
    const cmd = buildJumperCommand(type, query);

    try {
        const { stdout } = await execAsync(cmd);
        const lines = stdout.trim().split('\n')
            .filter(line => line.length > 0)
            .map(line => stripAnsiCodes(line.trim()));
        return lines;
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
        '**/node_modules/**',
        1000
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
        await pickFileInDirectory(expandTilde(dirPath));
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
                updateDatabase(document.fileName, 1.0);
            }
        })
    );

    // Track file saves
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.uri.scheme === 'file' && document.isDirty === false) {
                updateDatabase(document.fileName, 0.3);
            }
        })
    );

    // Track workspace folder changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(event => {
            event.added.forEach(folder => {
                updateDatabase(folder.uri.fsPath, 1.0);
            });
        })
    );

    // Update database with current workspace on activation
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        workspaceFolders.forEach(folder => {
            updateDatabase(folder.uri.fsPath, 1.0);
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
