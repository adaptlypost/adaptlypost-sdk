import type { HttpClient, RequestOptions } from '../http.js';
import type { RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

export class ConnectLinks {
  constructor(private readonly http: HttpClient) {}

  create(body: RequestBody<'createConnectLink'> = {}, options?: RequestOptions): Promise<ResponseBody<'createConnectLink'>> {
    return this.http.post('/connect-links', body, options);
  }

  revoke(token: string, options?: RequestOptions): Promise<ResponseBody<'revokeConnectLink'>> {
    return this.http.delete(`/connect-links/${segment(token)}`, options);
  }
}
