type FetchOptions = {
  body: {[key: string]: any};
  credentials?: string;
  expectedStatuses?: number[];
  method: string;
};
interface JsonFetchResponse {
  status: number;
  statusText: string;
  headers: Headers;
  text: string;
  body: any;
 }
export default function jsonFetch(uri: string, options: FetchOptions): Promise<JsonFetchResponse>;
