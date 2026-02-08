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
 * Show quick pick for files with live jumper queries
 */
async function jumpToFile() {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Type to search files (jumper query)';

    // Function to update results based on query
    const updateResults = async (query) => {
        quickPick.busy = true;
        const results = await executeJumper('files', query);

        quickPick.items = results.map(filePath => {
            // Expand ~ to home directory if needed
            const expandedPath = filePath.startsWith('~')
                ? filePath.replace('~', process.env.HOME || process.env.USERPROFILE)
                : filePath;

            return {
                label: path.basename(expandedPath),
                description: expandedPath,
                filePath: expandedPath,
                alwaysShow: true  // Prevent VSCode from filtering
            };
        });
        quickPick.busy = false;
    };

    // Load initial results
    await updateResults('');

    // Update results as user types
    quickPick.onDidChangeValue(async (value) => {
        await updateResults(value);
    });

    // Handle selection
    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        if (selected && selected.filePath) {
            quickPick.hide();
            try {
                const uri = vscode.Uri.file(selected.filePath);
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
            }
        }
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
}

/**
 * Show quick pick for files in a directory
 */
async function pickFileInDirectory(dirPath) {
    try {
        // Use glob pattern to find files recursively in the directory
        const pattern = new vscode.RelativePattern(dirPath, '**/*');
        const files = await vscode.workspace.findFiles(
            pattern,
            '**/node_modules/**', // exclude patterns
            1000 // max results
        );

        if (files.length === 0) {
            vscode.window.showInformationMessage(`No files found in ${dirPath}`);
            return;
        }

        const items = files.map(fileUri => {
            const relativePath = path.relative(dirPath, fileUri.fsPath);
            return {
                label: path.basename(fileUri.fsPath),
                description: relativePath,
                fileUri: fileUri
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Select a file in ${path.basename(dirPath)}`,
            matchOnDescription: true
        });

        if (selected) {
            const document = await vscode.workspace.openTextDocument(selected.fileUri);
            await vscode.window.showTextDocument(document);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to read directory: ${error.message}`);
    }
}

/**
 * Show quick pick for directories with live jumper queries
 */
async function jumpToDirectory() {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Type to search directories (jumper query)';

    // Function to update results based on query
    const updateResults = async (query) => {
        quickPick.busy = true;
        const results = await executeJumper('directories', query);

        quickPick.items = results.map(dirPath => {
            // Expand ~ to home directory if needed
            const expandedPath = dirPath.startsWith('~')
                ? dirPath.replace('~', process.env.HOME || process.env.USERPROFILE)
                : dirPath;

            return {
                label: path.basename(expandedPath),
                description: expandedPath,
                dirPath: expandedPath,
                alwaysShow: true  // Prevent VSCode from filtering
            };
        });
        quickPick.busy = false;
    };

    // Load initial results
    await updateResults('');

    // Update results as user types
    quickPick.onDidChangeValue(async (value) => {
        await updateResults(value);
    });

    // Handle selection
    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        if (selected && selected.dirPath) {
            quickPick.hide();
            // Show file picker in the selected directory
            await pickFileInDirectory(selected.dirPath);
        }
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
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
