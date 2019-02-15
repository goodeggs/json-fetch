// @flow
import _ from 'lodash';

import type {JsonFetchOptions} from '../index.js.flow';

export default function getRequestOptions (jsonFetchOptions: JsonFetchOptions): RequestOptions {
  const parsedOptions = {};
  parsedOptions.headers = {};

  if (jsonFetchOptions.body !== undefined) {
    parsedOptions.body = JSON.stringify(jsonFetchOptions.body);
    parsedOptions.headers['Content-Type'] = 'application/json';
  }

  if (jsonFetchOptions.credentials === undefined) {
    parsedOptions.credentials = 'include';
  }

  parsedOptions.headers = Object.assign(
    {},
    {
      Accept: 'application/json',
    },
    jsonFetchOptions.headers,
    parsedOptions.headers
  );

  const pickedOptions = _.pick(jsonFetchOptions, [
    'agent',
    'body',
    'cache',
    'credentials',
    'headers',
    'integrity',
    'method',
    'mode',
    'redirect',
    'referrer',
    'referrerPolicy',
    'timeout',
  ]);

  return Object.assign({}, pickedOptions, parsedOptions);
}
