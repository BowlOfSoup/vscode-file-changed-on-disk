// @ts-check
const vscode = require('vscode');

const LOAD = 'Load from disk';
const KEEP = 'Keep memory changes';
const COMPARE = 'Compare';
const SETTLE_MS = 100;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    /** @type {Set<string>} */
    const prompting = new Set();
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    const pending = new Map();
    const watcher = vscode.workspace.createFileSystemWatcher('**/*', true, false, true);

    // One write can fire several change events (Linux: truncate, then write); handle the burst once, after it settles
    watcher.onDidChange((uri) => {
        const key = uri.toString();
        clearTimeout(pending.get(key));
        pending.set(key, setTimeout(() => {
            pending.delete(key);
            onDiskChange(uri, prompting);
        }, SETTLE_MS));
    });

    context.subscriptions.push(watcher, { dispose: () => pending.forEach(clearTimeout) });
}

/**
 * @param {vscode.Uri} uri
 * @param {Set<string>} prompting
 */
async function onDiskChange(uri, prompting) {
    const key = uri.toString();
    const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === key);

    if (!document || !document.isDirty || prompting.has(key)) {
        return;
    }

    let onDisk;
    try {
        onDisk = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
    } catch {
        // Deleted or unreadable in the meantime: nothing to load
        return;
    }

    // Our own save also fires a change event; skip when the disk already matches the buffer
    if (onDisk === document.getText()) {
        return;
    }

    prompting.add(key);
    try {
        const choice = await vscode.window.showWarningMessage(
            `${vscode.workspace.asRelativePath(uri)} was changed on disk, but has unsaved changes.`,
            { modal: true },
            LOAD,
            KEEP,
            COMPARE,
        );

        if (choice === LOAD) {
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('workbench.action.files.revert');
        } else if (choice === COMPARE) {
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('workbench.files.action.compareWithSaved');
        }
    } finally {
        prompting.delete(key);
    }
}

function deactivate() {}

module.exports = { activate, deactivate, LOAD, KEEP, COMPARE };
