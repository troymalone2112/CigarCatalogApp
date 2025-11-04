module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_|^React$' },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    'react/prop-types': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-var-requires': 'off',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'ios/', 'android/'],
};
