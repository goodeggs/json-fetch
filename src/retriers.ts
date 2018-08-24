import _ from 'lodash';

export default {
  is5xx (response: Response | Error): boolean {
    // @ts-ignore we need a real type here
    return (response != null && response.status != null && (response.status === 503 || response.status === 504));
  },

  isNetworkError (response: Response | Error): boolean {
    return _.isError(response);
  },
};
