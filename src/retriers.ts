const isNonEmptyResponse = (candidate?: Response | Error): candidate is Response =>
  candidate != null && !(candidate instanceof Error);

export default {
  is5xx(response: Response | Error): boolean {
    if (
      isNonEmptyResponse(response) &&
      response?.status != null &&
      (response.status === 503 || response.status === 504)
    )
      return true;
    return false;
  },

  isNetworkError(response: Response | Error): boolean {
    return response instanceof Error;
  },
};
