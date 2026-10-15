import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['.vscode-test/', 'node_modules/'] },
    js.configs.recommended,
    {
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node, ...globals.mocha },
        },
    },
    {
        files: ['**/*.mjs'],
        languageOptions: { sourceType: 'module' },
    },
];
