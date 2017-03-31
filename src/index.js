// @flow
import 'isomorphic-fetch';
import promiseRetry from 'promise-retry';

export {default as retriers} from './retriers';

const DEFAULT_RETRY_OPTIONS = {retries: 0};
const DEFAULT_SHOULD_RETRY = () => false;

type JsonFetchRequestOptions = RequestOptions & {
  expectedStatuses?: Array<number>,
  shouldRetry?: () => boolean,
  retry?: Object,
}

type JsonFetchResponse = {
  status: number,
  statusText: string,
  headers: Headers,
  text: string,
  body: mixed,
}

export default async function jsonFetch (requestUrl: string, requestOptions: JsonFetchRequestOptions = {}): Promise<JsonFetchResponse> {
  const jsonRequestOptions = getJsonRequestOptions(requestOptions);
  const response = await retryFetch(requestUrl, jsonRequestOptions);
  const jsonFetchResponse = await createJsonFetchResponse(response);
  return jsonFetchResponse;
}

async function retryFetch (requestUrl: string, requestOptions: JsonFetchRequestOptions): Promise<Response> {
  const shouldRetry = requestOptions.shouldRetry || DEFAULT_SHOULD_RETRY;
  const retryOptions = Object.assign({}, DEFAULT_RETRY_OPTIONS, requestOptions.retry);
  return promiseRetry(async (retry) => {
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

function getJsonRequestOptions (requestOptions: JsonFetchRequestOptions): JsonFetchRequestOptions {
  const result = Object.assign({}, requestOptions);
  if (requestOptions.credentials === undefined)
    result.credentials = 'include';
  if (requestOptions.body)
    result.body = JSON.stringify(requestOptions.body);
  result.headers = Object.assign({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  // $FlowFixMe
  }, requestOptions.headers);
  return result;
}
