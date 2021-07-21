module.exports = {
  // lcov is used by Codecov on Travis, but can also be opened in browser: `open .coverage/lcov-report/index.html`
  reporter: ['lcov', 'text-summary'],
  extension: ['.js', '.jsx', '.ts', '.tsx'],
  all: true,
  exclude: [
    // Exclude generated/third-party files. NOTE: node_modules/ always excluded.
    '.coverage/**',
    'coverage/**',
    'lib/**',

    // Tests don't need to be tested 🙃
    '**/*test.{js,jsx,ts,tsx}',
    '**/test/**',
    '**/factory.ts',

    // Exclude config files
    '*.config.{js,ts}',
    '.*rc.js',
  ],
};
