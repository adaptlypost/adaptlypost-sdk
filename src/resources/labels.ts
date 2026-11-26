import type { HttpClient, RequestOptions } from '../http.js';
import type { ResponseBody } from '../types.js';

export class Labels {
  constructor(private readonly http: HttpClient) {}

  list(options?: RequestOptions): Promise<ResponseBody<'listLabels'>> {
    return this.http.get('/labels', undefined, options);
  }
}
