// @flow
import 'isomorphic-fetch';
import promiseRetry from 'promise-retry';

import getRequestOptions from './get_request_options';
import type {JsonFetchOptions, JsonFetchResponse, ShouldRetry} from '.'; // eslint-disable-line

export {default as retriers} from './retriers';

const DEFAULT_RETRY_OPTIONS = {retries: 0};
const DEFAULT_SHOULD_RETRY: ShouldRetry = () => false;

export default async function jsonFetch (requestUrl: string, jsonFetchOptions: JsonFetchOptions = {}): Promise<JsonFetchResponse> {
  const expectedStatuses = jsonFetchOptions.expectedStatuses;
  try {
    const response = await retryFetch(requestUrl, jsonFetchOptions);
    const jsonFetchResponse = await createJsonFetchResponse(response);
    assertExpectedStatus(expectedStatuses, jsonFetchResponse);
    return jsonFetchResponse;
  } catch (error) {
    error.request = getErrorRequestData({requestUrl, requestOptions: jsonFetchOptions});
    throw error;
  }
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
    body: getResponseBody(response, responseText),
  };
}

function createErrorResponse (response: Response, responseText: string) {
  // do not include headers as they potentially contain sensitive information
  return {
    status: response.status,
    statusText: response.statusText,
    text: responseText,
  };
}

function getResponseBody (response: Response, responseText: string): ?JSON {
  if (isApplicationJson(response.headers))
    try {
      return JSON.parse(responseText);
    } catch (err) {
      err.response = createErrorResponse(response, responseText);
      throw err;
    }
  return undefined;
}

function isApplicationJson (headers: Headers): boolean {
  const responseContentType = headers.get('Content-Type') || '';
  return /application\/json/.test(responseContentType);
}

function assertExpectedStatus <T: {+status: number}> (expectedStatuses: ?Array<number>, jsonFetchResponse: T): void {
  if (Array.isArray(expectedStatuses) && expectedStatuses.indexOf(jsonFetchResponse.status) === -1) {
    const err = new Error(`Unexpected fetch response status ${jsonFetchResponse.status}`);
    err.name = 'FetchUnexpectedStatusError';
    // $FlowFixMe
    err.response = jsonFetchResponse;
    throw err;
  }
}

function getErrorRequestData ({requestUrl, requestOptions}) {
  const data = Object.assign({}, requestOptions, {url: requestUrl});
  // do not include headers as they potentially contain sensitive information
  delete data.headers;
  return data;
}
