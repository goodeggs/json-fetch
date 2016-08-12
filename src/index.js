import 'isomorphic-fetch';
import objectAssign from 'object-assign';

export default function jsonFetch(URL, fetchOptions = {}) {
  let fetchOptionsClone = objectAssign({}, fetchOptions);
  const jsonHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (fetchOptionsClone.credentials === undefined) fetchOptionsClone.credentials = 'include';

  fetchOptionsClone.headers = objectAssign({}, jsonHeaders, fetchOptions.headers);
  try {
    fetchOptionsClone.body = JSON.stringify(fetchOptions.body);
  } catch (err) {}

  return fetch(URL, fetchOptionsClone)
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
  })
}
