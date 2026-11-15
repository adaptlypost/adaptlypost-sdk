import type { HttpClient, RequestOptions } from '../http.js';
import type { ResponseBody } from '../types.js';

export class Workspaces {
  constructor(private readonly http: HttpClient) {}

  list(options?: RequestOptions): Promise<ResponseBody<'listWorkspaces'>> {
    return this.http.get('/workspaces', undefined, options);
  }
}
