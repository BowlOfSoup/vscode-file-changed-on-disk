# File Changed on Disk

VS Code and VSCodium only tell you that a file changed on disk when you try to save it. If you have unsaved changes,
you find out late, and only then get to compare.

This extension asks right away, like JetBrains IDEs do. As soon as a file you have open with unsaved changes is
changed on disk (by git, a formatter, a script or an AI agent), you get a dialog:

- **Load from disk**: drop your unsaved changes and show the disk version
- **Keep memory changes**: keep editing; VS Code will still warn you when you save
- **Compare**: open a diff of your version against the disk version

Files without unsaved changes are reloaded by the editor itself, as usual. Saving your own file does not trigger the dialog.

## Limitations

- Only files inside the open workspace folders are watched
- Folders in `files.watcherExclude` are not watched, so changes there do not trigger the dialog
- The disk content is compared as UTF-8

## Development

```sh
npm install
npm run lint
npm test               # downloads a portable VS Code into .vscode-test/
npm run test:vscodium  # runs the tests in your installed VSCodium instead (macOS path)
npm run package        # builds the .vsix
```

Press F5, or run 'Developer: Reload Window' in the editor to start a window with the extension loaded.

