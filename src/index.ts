import 'isomorphic-fetch';

import {Agent} from 'http';
import promiseRetry from 'promise-retry';

import getRequestOptions from './get_request_options';

export type ShouldRetry = (responseOrError: Response | Error) => boolean;

export interface OnRequestOptions extends RequestInit {
  url: string;
  retryCount: number;
}

export interface OnRequestEndOptions extends OnRequestOptions {
  error?: Error;
  status?: Response['status'];
}
export interface JsonFetchOptions extends Omit<RequestInit, 'body'> {
  // node-fetch extensions (not available in browsers, i.e. whatwg-fetch) –
  // see https://github.com/node-fetch/node-fetch/blob/8721d79208ad52c44fffb4b5b5cfa13b936022c3/%40types/index.d.ts#L76:
  agent?: Agent | ((parsedUrl: URL) => Agent);

  // json-fetch options:
  body?: Record<string, unknown>;
  shouldRetry?: (responseOrError: Response | Error) => boolean;
  retry?: Parameters<typeof promiseRetry>[0];
  timeout?: number;
  expectedStatuses?: number[];
  onRequestStart?: (opts: OnRequestOptions) => void;
  onRequestEnd?: (opts: OnRequestEndOptions) => void;
}

export interface JsonFetchResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Headers;
  text: string;
  body: T;
}

export class FetchUnexpectedStatusError<
  T extends {
    readonly status: number;
  },
> extends Error {
  response?: T;
}

export {default as retriers} from './retriers';

const DEFAULT_RETRY_OPTIONS = {
  retries: 0,
};

const DEFAULT_SHOULD_RETRY: ShouldRetry = () => false;

export default async function jsonFetch(
  requestUrl: string,
  jsonFetchOptions: JsonFetchOptions = {},
): Promise<JsonFetchResponse> {
  const {expectedStatuses} = jsonFetchOptions;

  try {
    const response = await retryFetch(requestUrl, jsonFetchOptions);
    const jsonFetchResponse = await createJsonFetchResponse(response);
    assertExpectedStatus(expectedStatuses, jsonFetchResponse);
    return jsonFetchResponse;
  } catch (error) {
    error.request = getErrorRequestData({
      requestUrl,
      requestOptions: jsonFetchOptions,
    });
    throw error;
  }
}

async function retryFetch(
  requestUrl: string,
  jsonFetchOptions: JsonFetchOptions,
): Promise<Response> {
  const shouldRetry = jsonFetchOptions.shouldRetry ?? DEFAULT_SHOULD_RETRY;
  const retryOptions = {...DEFAULT_RETRY_OPTIONS, ...jsonFetchOptions.retry};
  const requestOptions = getRequestOptions(jsonFetchOptions);

  try {
    const response = await promiseRetry(async (throwRetryError, retryCount) => {
      jsonFetchOptions.onRequestStart?.({url: requestUrl, retryCount, ...requestOptions});
      try {
        const res = await fetch(requestUrl, requestOptions);
        if (shouldRetry(res)) throwRetryError(null);
        jsonFetchOptions.onRequestEnd?.({
          status: res.status,
          url: requestUrl,
          retryCount,
          ...requestOptions,
        });
        return res;
      } catch (err) {
        err.retryCount = retryCount - 1;
        jsonFetchOptions.onRequestEnd?.({
          error: err,
          url: requestUrl,
          retryCount,
          ...requestOptions,
        });
        if (err.code !== 'EPROMISERETRY' && shouldRetry(err)) throwRetryError(err);
        throw err;
      }
    }, retryOptions);
    return response;
  } catch (err) {
    if (err != null) {
      err.name = 'FetchError';
    }
    throw err;
  }
}

async function createJsonFetchResponse(response: Response): Promise<JsonFetchResponse> {
  const responseText = await response.text();
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    text: responseText,
    body: getResponseBody(response, responseText),
  };
}

interface ErrorResponse {
  status: number;
  statusText: string;
  text: string;
}
function createErrorResponse(response: Response, responseText: string): ErrorResponse {
  // do not include headers as they potentially contain sensitive information
  return {
    status: response.status,
    statusText: response.statusText,
    text: responseText,
  };
}

function getResponseBody(response: Response, responseText: string): JSON | null | undefined {
  if (isApplicationJson(response.headers))
    try {
      return JSON.parse(responseText);
    } catch (err) {
      err.response = createErrorResponse(response, responseText);
      throw err;
    }
  return undefined;
}

function isApplicationJson(headers: Headers): boolean {
  const responseContentType = headers.get('Content-Type') ?? '';
  return responseContentType.includes('application/json');
}

function assertExpectedStatus<
  T extends {
    readonly status: number;
  },
>(expectedStatuses: number[] | null | undefined, jsonFetchResponse: T): void {
  if (Array.isArray(expectedStatuses) && !expectedStatuses.includes(jsonFetchResponse.status)) {
    const err = new FetchUnexpectedStatusError(
      `Unexpected fetch response status ${jsonFetchResponse.status}`,
    );

    err.name = 'FetchUnexpectedStatusError';
    err.response = jsonFetchResponse;

    throw err;
  }
}

interface ErrorRequestData extends Omit<JsonFetchOptions, 'headers'> {
  url: string;
}
function getErrorRequestData({
  requestUrl,
  requestOptions,
}: {
  requestUrl: string;
  requestOptions: JsonFetchOptions;
}): ErrorRequestData {
  const data = {...requestOptions, url: requestUrl};
  // do not include headers as they potentially contain sensitive information
  delete data.headers;

  return data;
}
