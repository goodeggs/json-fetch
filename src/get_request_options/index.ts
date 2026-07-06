import _ from 'lodash';

import {JsonFetchOptions} from '..';

export default function getRequestOptions(jsonFetchOptions: JsonFetchOptions): RequestInit {
  const parsedOptions: RequestInit = {};

  if (jsonFetchOptions.body !== undefined) {
    parsedOptions.body = JSON.stringify(jsonFetchOptions.body);
  }

  if (jsonFetchOptions.credentials === undefined) {
    parsedOptions.credentials = 'include';
  }

  // HTTP header names are case-insensitive, but a plain object merge is not: a caller's
  // 'content-type' plus our 'Content-Type' stay two separate keys, and native fetch combines
  // them into the invalid header "application/json, application/json", which body parsers
  // reject. Normalize names to lowercase so the merge deduplicates; later entries still win.
  const mergedHeaders: Record<string, string> = {
    accept: 'application/json',
    ...(jsonFetchOptions.headers as Record<string, string> | undefined),
    ...(jsonFetchOptions.body !== undefined ? {'content-type': 'application/json'} : {}),
  };
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(mergedHeaders)) {
    headers[name.toLowerCase()] = value;
  }
  parsedOptions.headers = headers;

  const pickedOptions = _.pick(jsonFetchOptions, [
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

  return {...pickedOptions, ...parsedOptions};
}
