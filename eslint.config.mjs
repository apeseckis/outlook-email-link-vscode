import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.vscode-test/**'] },
  ...tseslint.configs.recommended,
  { files: ['scripts/*.mjs'], languageOptions: { globals: { process: 'readonly' } } }
);
