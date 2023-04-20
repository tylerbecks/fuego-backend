module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:n/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    project: true,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort'],
  rules: {
    '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true }],
    'simple-import-sort/exports': 'error',
    'simple-import-sort/imports': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-deprecated': 'warn',
    'import/no-mutable-exports': 'error',
    'import/no-unresolved': 'error',
    'import/no-useless-path-segments': 'error',
    'n/no-missing-import': 'off',
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
      },
      node: true,
    },
  },
  overrides: [
    {
      files: ['scraper/**/*', 'scripts/**/*', '**/*.test.ts'],
      rules: {
        'n/no-unpublished-import': 'off',
      },
    },
  ],
};
