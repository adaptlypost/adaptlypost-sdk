import type { HttpClient, RequestOptions } from '../http.js';
import type { RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

export class Workspaces {
  constructor(private readonly http: HttpClient) {}

  list(options?: RequestOptions): Promise<ResponseBody<'listWorkspaces'>> {
    return this.http.get('/workspaces', undefined, options);
  }

  create(body: RequestBody<'createWorkspace'>, options?: RequestOptions): Promise<ResponseBody<'createWorkspace'>> {
    return this.http.post('/workspaces', body, options);
  }

  delete(id: string, options?: RequestOptions): Promise<ResponseBody<'deleteWorkspace'>> {
    return this.http.delete(`/workspaces/${segment(id)}`, options);
  }
}
