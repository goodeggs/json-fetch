# JSON Fetch

[![codecov badge](https://codecov.io/gh/goodeggs/json-fetch/branch/master/graph/badge.svg)](https://codecov.io/gh/goodeggs/json-fetch)

A wrapper around ES6 fetch to simplify interacting with JSON APIs.

- automatically JSON stringify request body
- set JSON request headers
- resolve with json for any response with the `Content-Type`: `application/json` header
- include request credentials by default
- configurable retry option for requests

[![build status][travis-badge]][travis-link]
[![MIT license][license-badge]][license-link]

## Usage

```sh
yarn add json-fetch
# or...
npm install json-fetch
```

```js
import jsonFetch from 'json-fetch';

jsonFetch('http://www.test.com/products/1234', {
  body: {name: 'apple'}, // content to be JSON stringified
  credentials: 'omit', // "include" by default
  expectedStatuses: [201], // rejects "FetchUnexpectedStatusError" on unexpected status (optional)
  // supports all normal json-fetch options:
  method: 'POST',
})
  .then((response) => {
    // handle response with expected status:
    console.log(response.body); // json response here
    console.log(response.status);
    console.log(response.statusText);
    console.log(response.headers);
  })
  .catch((err) => {
    // handle response with unexpected status:
    console.log(err.name);
    console.log(err.message);
    console.log(err.response.status);
    console.log(err.response.statusText);
    console.log(err.response.body);
    console.log(err.response.text);
    console.log(err.response.headers);
  });
```

### TypeScript

This library comes with built-in TypeScript type declarations.

Due to complexities in dealing with isomorphic-fetch - which uses whatwg-fetch in browsers and node-fetch
in node.js, which are subtly different - these type declarations only work if you include the `DOM` built-in
TypeScript lib in your `tsconfig.json`. For example:

```json
{
  "lib": ["DOM", "ES2020"]
}
```

This happens implicitly if you don't set a `lib`.

This may be fixed in the future.

### Retry Behavior

By default, jsonFetch doesn't retry requests. However, you may opt in to jsonFetch's very flexible retry behavior, provided by the excellent [`promise-retry`](https://github.com/IndigoUnited/node-promise-retry) library. Here's a quick example:

```js
import jsonFetch, {retriers} from 'json-fetch'

jsonFetch('http://www.test.com/products/1234', {
  method: 'POST',
  body: {name: 'apple'},
  shouldRetry: retriers.isNetworkError // after every request, retry if a network error is thrown
  retry: {
    // Retry 5 times, in addition to the original request
    retries: 5,
  }
}).then(response => {
  // handle responses
});
```

Any option that `promise-retry` accepts will be passed through from `options.retry`. See [the promise-retry documentation](https://github.com/IndigoUnited/node-promise-retry#promiseretryfn-options) for all options.

### Custom Retry Logic

We've provided two default "retrier" functions that decide to retry 503/504 status code responses and network errors (`jsonFetch.retriers.is5xx` and `jsonFetch.retriers.isNetworkError` respectively). You can easily provide your own custom retrier function to `options.shouldRetry`.

The contract for a retrier function is:

```js
shouldRetry([Error || FetchResponse]) returns bool
```

You can use any attribute of the [FetchResponse](https://developer.mozilla.org/en-US/docs/Web/API/Response) or Error to determine whether to retry or not. Your function _must_ handle both errors (such as network errors) and FetchResponse objects without blowing up. We recommend stateless, side-effect free functions. You do not need to worry about the maximum number of retries -- promise-retry will stop retrying after the maximum you specify. See the tests and `src/retriers.js` file for examples.

### On Request callbacks

Two callback functions can be passed as options to do something `onRequestStart` and `onRequestEnd`. This may be especially helpful to log request and response data on each request.
If you have retries enabled, these will trigger before and after each _actual, individual request_.

#### `onRequestStart`

If given, `onRequestStart` is called with:

```typescript
{
  // ... all the original json-fetch options, plus:
  url: string;
  retryCount: number;
}
```

#### `onRequestEnd`

If given, `onRequestEnd` is called with:

```typescript
{
  // ... all the original json-fetch options, plus:
  url: string;
  retryCount: number;
  status?: Response['status'];
  error?: Error;
}
```

For example, to log before and after each request:

```typescript
const requestUrl = 'http://www.test.com/products/1234';
await jsonFetch(requestUrl, {
  onRequestStart: ({url, timeout, retryCount}) =>
    console.log(`Requesting ${url} with timeout ${timeout}, attempt ${retryCount}`),
  onRequestEnd: ({url, retryCount, status}) =>
    console.log(`Requested ${url}, attempt ${retryCount}, got status ${status}`),
});
```

## Contributing

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) when contributing to this project.

```
yarn install
yarn test
```

## Deploying a new version

This module is automatically deployed when a version tag bump is detected by Travis.
Remember to update the [changelog](CHANGELOG.md)!

```
yarn version
```

## License

[MIT](License.md)

_Module scaffold generated by [generator-goodeggs-npm](https://github.com/goodeggs/generator-goodeggs-npm)._

[travis-badge]: http://img.shields.io/travis/goodeggs/json-fetch.svg?style=flat-square
[travis-link]: https://travis-ci.org/goodeggs/json-fetch
[npm-badge]: http://img.shields.io/npm/v/json-fetch.svg?style=flat-square
[npm-link]: https://www.npmjs.org/package/json-fetch
[license-badge]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[license-link]: LICENSE.md
