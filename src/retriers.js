// @flow
export default {
  is5xx(response: Response | Error): boolean {
    if (response && response.status && (response.status === 503 || response.status === 504))
      return true;
    return false;
  },

  isNetworkError(response: Response | Error): boolean {
    return response instanceof Error;
  },
};
