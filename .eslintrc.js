module.exports = {
  root: true,
  extends: ['plugin:goodeggs/recommended', 'plugin:goodeggs/flowtype'],
  env: {
    node: true,
  },
  rules: {
    camelcase: 'off',
  },
};
