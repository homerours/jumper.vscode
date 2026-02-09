const vscode = require('vscode');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Get weight from configuration
 */
function getWeight(type) {
    const config = vscode.workspace.getConfiguration('jumper.weights');
    return config.get(type);
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

module.exports = {
    checkJumperInstalled,
    updateDatabase,
    executeJumper,
    getWeight
};
