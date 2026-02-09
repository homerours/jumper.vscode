const vscode = require('vscode');
const { checkJumperInstalled, updateDatabase, getWeight } = require('./database');
const { jumpToFile, jumpToDirectory } = require('./commands');

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
 * Helper to track file/notebook opens
 */
function trackOpen(uri) {
    if (uri.scheme === 'file') {
        updateDatabase(uri.fsPath, getWeight('visit'));
    }
}

/**
 * Helper to track file/notebook saves with reason
 */
function trackSave(uri, reason) {
    if (uri.scheme === 'file') {
        const weight = reason === vscode.TextDocumentSaveReason.Manual
            ? getWeight('manualSave')
            : getWeight('autoSave');
        updateDatabase(uri.fsPath, weight);
    }
}

/**
 * Helper to create debounced active editor tracker
 */
function createActiveEditorTracker(debounceDelay) {
    return debounce((filePath) => {
        updateDatabase(filePath, getWeight('activeEditor'));
    }, debounceDelay);
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

    // Get debounce delay configuration
    const config = vscode.workspace.getConfiguration('jumper');
    const debounceDelay = config.get('debounceDelay', 500);
    const debouncedActiveEditorUpdate = createActiveEditorTracker(debounceDelay);

    // Track file opens
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => trackOpen(document.uri))
    );

    // Track notebook opens
    context.subscriptions.push(
        vscode.workspace.onDidOpenNotebookDocument(notebook => trackOpen(notebook.uri))
    );

    // Track file saves with different weights for manual vs auto save
    context.subscriptions.push(
        vscode.workspace.onWillSaveTextDocument(event =>
            trackSave(event.document.uri, event.reason)
        )
    );

    // Track notebook saves with different weights for manual vs auto save
    context.subscriptions.push(
        vscode.workspace.onWillSaveNotebookDocument(event =>
            trackSave(event.notebook.uri, event.reason)
        )
    );

    // Track active editor changes (switching between text document tabs)
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor?.document.uri.scheme === 'file') {
                debouncedActiveEditorUpdate(editor.document.uri.fsPath);
            }
        })
    );

    // Track active notebook editor changes (switching between notebook tabs)
    context.subscriptions.push(
        vscode.window.onDidChangeActiveNotebookEditor(editor => {
            if (editor?.notebook.uri.scheme === 'file') {
                debouncedActiveEditorUpdate(editor.notebook.uri.fsPath);
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
