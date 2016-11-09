export let retriers = {
  is5xx: (response) => {
    if (response && response.status &&
       (response.status === 503 ||
        response.status === 504)) {
        return true;
    }
    return false;
  },

  isNetworkError: (response) => {
    return response instanceof Error;
  }
};
