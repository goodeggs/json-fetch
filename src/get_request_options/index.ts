import _ from 'lodash';

import {JsonFetchOptions} from '..';

export default function getRequestOptions(jsonFetchOptions: JsonFetchOptions): RequestInit {
  const parsedOptions: RequestInit = {};
  parsedOptions.headers = {};

  if (jsonFetchOptions.body !== undefined) {
    parsedOptions.body = JSON.stringify(jsonFetchOptions.body);
    parsedOptions.headers['Content-Type'] = 'application/json';
  }

  if (jsonFetchOptions.credentials === undefined) {
    parsedOptions.credentials = 'include';
  }

  parsedOptions.headers = {
    accept: 'application/json',
    ...jsonFetchOptions.headers,
    ...parsedOptions.headers,
  };

  const pickedOptions = _.pick(
    jsonFetchOptions,
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
  );

  // Picked options intentionally include node-fetch extensions (e.g. timeout) that are not part
  // of the standard RequestInit type; runtime fetch implementations ignore what they don't know.
  return {...pickedOptions, ...parsedOptions} as RequestInit;
}
