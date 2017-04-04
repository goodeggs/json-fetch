// @flow
import 'isomorphic-fetch';
import promiseRetry from 'promise-retry';

export {default as retriers} from './retriers';
import type {JsonFetchOptions, JsonFetchResponse} from '.'; // eslint-disable-line

const DEFAULT_RETRY_OPTIONS = {retries: 0};
const DEFAULT_SHOULD_RETRY = () => false;

export default async function jsonFetch (requestUrl: string, jsonFetchOptions: JsonFetchOptions = {}): Promise<JsonFetchResponse> {
  const expectedStatuses = jsonFetchOptions.expectedStatuses;
  const response = await retryFetch(requestUrl, jsonFetchOptions);
  const jsonFetchResponse = await createJsonFetchResponse(response);
  assertExpectedStatus(expectedStatuses, jsonFetchResponse);
  return jsonFetchResponse;
}

async function retryFetch (requestUrl: string, jsonFetchOptions: JsonFetchOptions): Promise<Response> {
  const shouldRetry = jsonFetchOptions.shouldRetry || DEFAULT_SHOULD_RETRY;
  const retryOptions = Object.assign({}, DEFAULT_RETRY_OPTIONS, jsonFetchOptions.retry);
  const requestOptions = getRequestOptions(jsonFetchOptions);
  try {
    const response = await promiseRetry(async (retry) => {
      try {
        const res = await fetch(requestUrl, requestOptions);
        if (shouldRetry(res))
          return retry();
        return res;
      } catch (err) {
        if (shouldRetry(err))
          return retry(err);
        throw err;
      }
    }, retryOptions);
    return response;
  } catch (err) {
    err.name = 'FetchNetworkError';
    throw err;
  }
}

async function createJsonFetchResponse (response: Response): Promise<JsonFetchResponse> {
  const responseText = await response.text();
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    text: responseText,
    body: getResponseBody(response.headers, responseText),
  };
}

function getResponseBody (responseHeaders: Headers, responseText: string): mixed {
  if (isApplicationJson(responseHeaders))
    return JSON.parse(responseText);
  return responseText;
}

function isApplicationJson (headers: Headers): boolean {
  const responseContentType = headers.get('Content-Type') || '';
  return responseContentType.includes('application/json');
}

function assertExpectedStatus <T: {+status: number}> (expectedStatuses: ?Array<number>, jsonFetchResponse: T): void {
  if (Array.isArray(expectedStatuses) && !expectedStatuses.includes(jsonFetchResponse.status))
    throw new FetchUnexpectedStatusError(jsonFetchResponse);
}

function getRequestOptions (jsonFetchOptions: JsonFetchOptions): RequestOptions {
  return {
    body: jsonFetchOptions.body !== undefined ? JSON.stringify(jsonFetchOptions.body) : undefined,
    credentials: jsonFetchOptions.credentials !== undefined ? 'include' : undefined,
    // $FlowFixMe
    headers: Object.assign({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }, jsonFetchOptions.headers),
    cache: jsonFetchOptions.cache,
    integrity: jsonFetchOptions.integrity,
    method: jsonFetchOptions.method,
    mode: jsonFetchOptions.mode,
    redirect: jsonFetchOptions.redirect,
    referrer: jsonFetchOptions.referrer,
    referrerPolicy: jsonFetchOptions.referrerPolicy,
  };
}

class FetchUnexpectedStatusError extends Error {
  name: string;
  response: JsonFetchResponse;
  constructor (response: Object) {
    super();
    this.name = 'FetchUnexpectedStatusError';
    this.message = `Unexpected fetch response status ${response.status}`;
    this.response = response;
  }
}
