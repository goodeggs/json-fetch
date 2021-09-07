module.exports = {
  root: true,
  parserOptions: {
    project: './tsconfig.json',
  },
  extends: ['plugin:goodeggs/recommended', 'plugin:goodeggs/typescript'],
  env: {
    node: true,
    browser: true,
  },
  rules: {},
};
