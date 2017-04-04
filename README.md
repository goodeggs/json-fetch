# JSON Fetch

A wrapper around ES6 fetch to simplify interacting with JSON APIs.

- automatically JSON stringify request body
- set JSON request headers
- resolve with json for any response with the `Content-Type`: `application/json` header
- include request credentials by default
- configurable retry option for requests

[![build status][travis-badge]][travis-link]
[![npm version][npm-badge]][npm-link]
[![MIT license][license-badge]][license-link]
[![we're hiring][hiring-badge]][hiring-link]

## Usage

```
npm install json-fetch
```

```js
import jsonFetch from 'json-fetch'

jsonFetch('http://www.test.com/products/1234', {
  body: {name: 'apple'}, // content to be JSON stringified
  credentials: 'omit', // "include" by default
  expectedStatuses: [201], // rejects "FetchUnexpectedStatusError" on unexpected status (optional)
  // supports all normal json-fetch options:
  method: 'POST',
})
.then((response) => {
  // handle response with expected status:
  console.log(response.body) // json response here
  console.log(response.status)
  console.log(response.statusText)
  console.log(response.headers)
})
.catch((err) => {
  // handle response with unexpected status:
  console.log(err.name)
  console.log(err.message)
  console.log(err.response.status)
  console.log(err.response.statusText)
  console.log(err.response.body)
  console.log(err.response.text)
  console.log(err.response.headers)
})
```

### Retry Behavior

By default, jsonFetch doesn't retry requests. However, you may opt in to jsonFetch's very flexible retry behavior, provided by the excellent [`promise-retry`](https://github.com/IndigoUnited/node-promise-retry) library. Here's a quick example:

```js
import jsonFetch, {retriers} from 'json-fetch'

jsonFetch('http://www.test.com/products/1234', {
  method: 'POST',
  body: {name: 'apple'},
  shouldRetry: retries.isNetworkError // after every request, retry if a network error is thrown
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

## Contributing

Please follow our [Code of Conduct](https://github.com/goodeggs/json-fetch/blob/master/CODE_OF_CONDUCT.md)
when contributing to this project.

```
$ git clone https://github.com/goodeggs/json-fetch && cd json-fetch
$ npm install
$ npm test
```

_Module scaffold generated by [generator-goodeggs-npm](https://github.com/goodeggs/generator-goodeggs-npm)._


[travis-badge]: http://img.shields.io/travis/goodeggs/json-fetch.svg?style=flat-square
[travis-link]: https://travis-ci.org/goodeggs/json-fetch
[npm-badge]: http://img.shields.io/npm/v/json-fetch.svg?style=flat-square
[npm-link]: https://www.npmjs.org/package/json-fetch
[license-badge]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[license-link]: LICENSE.md
[hiring-badge]: https://img.shields.io/badge/we're_hiring-yes-brightgreen.svg?style=flat-square
[hiring-link]: http://goodeggs.jobscore.com/?detail=Open+Source&sid=161
