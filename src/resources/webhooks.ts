import type { HttpClient, RequestOptions } from '../http.js';
import type { RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

export class Webhooks {
  constructor(private readonly http: HttpClient) {}

  create(body: RequestBody<'createWebhook'>, options?: RequestOptions): Promise<ResponseBody<'createWebhook'>> {
    return this.http.post('/webhooks', body, options);
  }

  list(options?: RequestOptions): Promise<ResponseBody<'listWebhooks'>> {
    return this.http.get('/webhooks', undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<ResponseBody<'getWebhook'>> {
    return this.http.get(`/webhooks/${segment(id)}`, undefined, options);
  }

  update(id: string, body: RequestBody<'updateWebhook'>, options?: RequestOptions): Promise<ResponseBody<'updateWebhook'>> {
    return this.http.patch(`/webhooks/${segment(id)}`, body, options);
  }

  delete(id: string, options?: RequestOptions): Promise<ResponseBody<'deleteWebhook'>> {
    return this.http.delete(`/webhooks/${segment(id)}`, options);
  }

  test(id: string, options?: RequestOptions): Promise<ResponseBody<'testWebhook'>> {
    return this.http.post(`/webhooks/${segment(id)}/test`, undefined, options);
  }
}
