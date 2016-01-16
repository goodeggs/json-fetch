import promiseRetry from 'promise-retry'
import objectAssign from 'object-assign'

module.exports = function createJsonFetch(fetch) {
  return function jsonFetch(URL, fetchOptions = {}, MAX_RETRY_ATTEMPTS = 5) {
    let fetchOptionsClone = objectAssign({}, fetchOptions);
    const jsonHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    fetchOptionsClone.headers = objectAssign({}, jsonHeaders, fetchOptions.headers);
    try {
      fetchOptionsClone.body = JSON.stringify(fetchOptions.body)
    } catch (err) {}


    return promiseRetry((retry) => {
      return fetch(URL, fetchOptionsClone).catch(retry)
    }, {
      retries: MAX_RETRY_ATTEMPTS
    }).then((response) => {
      const jsonFetchResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      }
      if (200 <= response.status && response.status < 300) {
        return response.json().then(function (json) {
          return objectAssign({}, jsonFetchResponse, {body: json})
        })
      } else if (response.status === 404) {
        return objectAssign({}, jsonFetchResponse, {body: undefined})
      } else {
        return response.text().then(function(text) {
          const err = objectAssign(new Error(response.statusText), jsonFetchResponse, {body: text})
          throw err;
        });
      }
    })
  }
}
