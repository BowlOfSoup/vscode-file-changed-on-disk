import { defineConfig } from '@vscode/test-cli';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
    files: 'test/**/*.test.js',
    // Test against the editor at VSCODE_TEST_PATH (e.g. your VSCodium); without it, a portable VS Code is downloaded
    ...(process.env.VSCODE_TEST_PATH ? { useInstallation: { fromPath: process.env.VSCODE_TEST_PATH } } : {}),
    workspaceFolder: mkdtempSync(join(tmpdir(), 'file-changed-on-disk-')),
    // CI runners have no GPU, and a trust prompt in the temp workspace would block the window
    launchArgs: ['--disable-gpu', '--disable-workspace-trust'],
    mocha: { ui: 'tdd', timeout: 20000 },
});
