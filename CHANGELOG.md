# [Changes since last deploy](https://github.com/goodeggs/json-fetch/compare/v8.0.0...master)

# [9.0.8](https://github.com/goodeggs/json-fetch/compare/v9.0.9...v9.0.10)

- Check if incoming Fetch error is of type `null` before setting the code property.

# [9.0.8](https://github.com/goodeggs/json-fetch/compare/v9.0.8...v9.0.9)

- Replaced `responseOrError` prop of `OnRequestEnd` by `error` and `status`

# [9.0.8](https://github.com/goodeggs/json-fetch/compare/v9.0.3...v9.0.8)

- Added `OnRequestStart` callback function
- Added `OnRequestEnd` callback function

# [9.0.4](https://github.com/goodeggs/json-fetch/compare/v9.0.3...v9.0.4)

- Migrated to Typescript
- Removed Husky & Lint-staged

# [9.0.3](https://github.com/goodeggs/json-fetch/compare/v8.0.0...v9.0.3)

## Breaking changes

- Only support [Node 12+](https://github.com/nodejs/Release#release-schedule) due to requirements from updated dependencies.

# [8.0.0](https://github.com/goodeggs/json-fetch/compare/v7.5.1...v8.0.0)

## Breaking changes

- Only support [Node 8+](https://github.com/nodejs/Release#release-schedule) due to requirements from updated dependencies.

## Adopt Good Eggs developer tooling best practices

- Babel 7 for build & modern js features
- Eslint for code correctness
- Prettier for formatting
- leasot for todos
- Husky & Lint-staged for auto format & lint on commit
- Package scripts to run all the above
- Deploy from CI
- Use a changelog ;)
- Update dependencies
