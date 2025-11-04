module.exports = {
  root: true,
  env: { es2021: true, node: true, jest: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2021,
    sourceType: 'module',
    project: undefined
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  settings: {
    react: { version: 'detect' }
  },
  ignorePatterns: ['node_modules/', 'dist/', 'web-build/', 'android/', 'ios/'],
  rules: {
    'react/prop-types': 'off'
  }
};
