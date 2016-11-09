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
    const jsonFetchResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
    if (200 <= response.status && response.status < 300) {
      return response.json().then(function (json) {
        return objectAssign({}, jsonFetchResponse, {body: json});
      })
    } else if (response.status === 404) {
      return objectAssign({}, jsonFetchResponse, {body: undefined});
    } else {
      return response.text().then(function(text) {
        const err = objectAssign(new Error(response.statusText), jsonFetchResponse, {body: text});
        throw err;
      });
    }
  });
}
