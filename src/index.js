import 'isomorphic-fetch';
import promiseRetry from 'promise-retry';
import objectAssign from 'object-assign';

export {retriers} from './retriers';

const DEFAULT_RETRY_OPTIONS = {
  retries: 0,
};

const DEFAULT_SHOULD_RETRY = () => false;

export default function jsonFetch(URL, options = {}) {
  const fetchOptions = objectAssign({}, options);
  const shouldRetry = options.shouldRetry || DEFAULT_SHOULD_RETRY;
  const retryOptions = objectAssign(DEFAULT_RETRY_OPTIONS, options.retry);
  const jsonHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (fetchOptions.credentials === undefined) fetchOptions.credentials = 'include';

  fetchOptions.headers = objectAssign({}, jsonHeaders, fetchOptions.headers);
  try {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  } catch (err) {}

  return promiseRetry((retry) => {
    return fetch(URL, fetchOptions)
      .then((response) => {
        if (shouldRetry(response)) {
          return retry();
        }
        return response;
      })
      .catch((err) => {
        if (shouldRetry(err)) {
          return retry(err);
        }
        throw err;
      })
  }, retryOptions)
  .then((response) => {
    return response.text()
    .then((text) => {
      const jsonFetchResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        text,
      };

      const contentType = jsonFetchResponse.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        try {
          jsonFetchResponse.body = JSON.parse(text);
        } catch (err) {
          err.response = jsonFetchResponse;
          throw err;       
        }
      } else {
        jsonFetchResponse.body = text;
      }

      return jsonFetchResponse;
    })
  });
}
