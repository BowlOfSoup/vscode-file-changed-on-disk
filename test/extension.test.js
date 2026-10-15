// @ts-check
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { LOAD, KEEP } = require('../src/extension');

// The file watcher only sees workspace folders; .vscode-test.mjs opens one
const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

/**
 * @param {() => boolean} condition
 */
async function waitFor(condition, timeout = 5000) {
    const end = Date.now() + timeout;
    while (!condition()) {
        if (Date.now() > end) {
            throw new Error('Timed out');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
}

/**
 * Opens a file, makes an unsaved edit, then changes the file on disk.
 * Returns the document and the messages the extension showed.
 *
 * @param {string | undefined} answer
 */
async function changeOnDiskWhileDirty(answer) {
    const file = path.join(workspace, `${answer ?? 'none'}-${Date.now()}.txt`);
    fs.writeFileSync(file, 'original\n');
    // Let the watcher report the creation first, or it merges it with the change below
    await new Promise((resolve) => setTimeout(resolve, 1000));

    /** @type {string[]} */
    const messages = [];
    const original = vscode.window.showWarningMessage;
    // @ts-ignore stub the dialog
    vscode.window.showWarningMessage = async (message) => {
        messages.push(message);
        return answer;
    };

    try {
        const document = await vscode.workspace.openTextDocument(file);
        const editor = await vscode.window.showTextDocument(document);
        await editor.edit((edit) => edit.insert(new vscode.Position(0, 0), 'in memory '));

        fs.writeFileSync(file, 'changed on disk\n');
        await waitFor(() => messages.length > 0);
        await new Promise((resolve) => setTimeout(resolve, 300));

        return { document, messages };
    } finally {
        vscode.window.showWarningMessage = original;
    }
}

suite('File Changed on Disk', () => {
    suiteSetup(async () => {
        const extension = vscode.extensions.all.find((ext) => ext.id.endsWith('.file-changed-on-disk'));
        await extension?.activate();
    });

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    });

    test('Load from disk replaces the unsaved changes with the disk content', async () => {
        const { document, messages } = await changeOnDiskWhileDirty(LOAD);

        assert.strictEqual(messages.length, 1);
        assert.match(messages[0], /was changed on disk, but has unsaved changes\.$/);
        await waitFor(() => !document.isDirty);
        assert.strictEqual(document.getText(), 'changed on disk\n');
    });

    test('Keep memory changes leaves the unsaved changes alone', async () => {
        const { document } = await changeOnDiskWhileDirty(KEEP);

        assert.strictEqual(document.isDirty, true);
        assert.strictEqual(document.getText(), 'in memory original\n');
    });

    test('Saving your own changes does not ask anything', async () => {
        const file = path.join(workspace, `save-${Date.now()}.txt`);
        fs.writeFileSync(file, 'original\n');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        /** @type {string[]} */
        const messages = [];
        const original = vscode.window.showWarningMessage;
        // @ts-ignore stub the dialog
        vscode.window.showWarningMessage = async (message) => {
            messages.push(message);
        };

        try {
            const document = await vscode.workspace.openTextDocument(file);
            const editor = await vscode.window.showTextDocument(document);
            await editor.edit((edit) => edit.insert(new vscode.Position(0, 0), 'in memory '));
            await document.save();
            await new Promise((resolve) => setTimeout(resolve, 1000));

            assert.deepStrictEqual(messages, []);
        } finally {
            vscode.window.showWarningMessage = original;
        }
    });

    test('Closing the dialog leaves the unsaved changes alone', async () => {
        const { document } = await changeOnDiskWhileDirty(undefined);

        assert.strictEqual(document.isDirty, true);
        assert.strictEqual(document.getText(), 'in memory original\n');
    });
});
