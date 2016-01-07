require('es6-promise').polyfill()
require('isomorphic-fetch')
promiseRetry = require('promise-retry')

module.exports = function(url, fetchOptions, maxRetryAttempts) {
  var fetchOptionsClone = _.assign({}, fetchOptions);
  var jsonHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  fetchOptionsClone.headers = _.assign({}, jsonHeaders, fetchOptions.headers);
  if (fetchOptions.body) {
    fetchOptionsClone.body = JSON.stringify(fetchOptions.body);
    fetchOptionsClone.body = JSON.stringify(fetchOptions.body);
  }

  return promiseRetry(function(retry) {
    return fetch(url, fetchOptionsClone).catch(retry)
  }, {
    retries: maxRetryAttempts
  }).then(function(response) {
    if (200 <= response.status && response.status < 300) {
      return response.json()
    } else if (response.status === 404) {
      return undefined;
    } else {
      return response.text().then(function(responseBody) {
        var err = new Error(response.statusText);
        err.response = response;
        err.statusCode = response.status;
        err.responseBody = responseBody;
        throw err;
      });
    }
  })
};
