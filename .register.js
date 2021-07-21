// Temporary entrypoint wrapper for various `yarn` scripts to configure @babel/register for TypeScript
// TODO(murkey) Remove this file and:
// - Use this wrapper: https://github.com/deepsweet/babel-register-ts
// - Get a new version of @babel/register with built-in support: https://github.com/babel/babel/pull/6027
// - Get a version of babel that allows extensions to be configured via .babelrc/package.json: https://github.com/babel/babel/issues/3741
require('@babel/register')({
  extensions: ['.ts'],
});
