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
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    project: true,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true }],
    'n/no-missing-import': 'off',
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
