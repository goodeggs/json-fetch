// @flow
import 'isomorphic-fetch';
import promiseRetry from 'promise-retry';

import getRequestOptions from './get_request_options';
import type {JsonFetchOptions, JsonFetchResponse} from '.'; // eslint-disable-line

export {default as retriers} from './retriers';

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
    const response = await promiseRetry(async (throwRetryError) => {
      try {
        const res = await fetch(requestUrl, requestOptions);
        if (shouldRetry(res))
          throwRetryError();
        return res;
      } catch (err) {
        if (err.code !== 'EPROMISERETRY' && shouldRetry(err))
          throwRetryError(err);
        throw err;
      }
    }, retryOptions);
    return response;
  } catch (err) {
    err.name = 'FetchError';
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

function getResponseBody (responseHeaders: Headers, responseText: string): ?JSON {
  if (isApplicationJson(responseHeaders))
    return JSON.parse(responseText);
  return undefined;
}

function isApplicationJson (headers: Headers): boolean {
  const responseContentType = headers.get('Content-Type') || '';
  return responseContentType.includes('application/json');
}

function assertExpectedStatus <T: {+status: number}> (expectedStatuses: ?Array<number>, jsonFetchResponse: T): void {
  if (Array.isArray(expectedStatuses) && !expectedStatuses.includes(jsonFetchResponse.status)) {
    const err = new Error(`Unexpected fetch response status ${jsonFetchResponse.status}`);
    err.name = 'FetchUnexpectedStatusError';
    // $FlowFixMe
    err.response = jsonFetchResponse;
    throw err;
  }
}
