import type { HttpClient, RequestOptions } from '../http.js';
import type { QueryParams, RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

export class RssFeeds {
  constructor(private readonly http: HttpClient) {}

  list(options?: RequestOptions): Promise<ResponseBody<'listRssFeeds'>> {
    return this.http.get('/rss-feeds', undefined, options);
  }

  create(body: RequestBody<'createRssFeed'>, options?: RequestOptions): Promise<ResponseBody<'createRssFeed'>> {
    return this.http.post('/rss-feeds', body, options);
  }

  preview(body: RequestBody<'previewRssFeed'>, options?: RequestOptions): Promise<ResponseBody<'previewRssFeed'>> {
    return this.http.post('/rss-feeds/preview', body, options);
  }

  get(id: string, options?: RequestOptions): Promise<ResponseBody<'getRssFeed'>> {
    return this.http.get(`/rss-feeds/${segment(id)}`, undefined, options);
  }

  update(id: string, body: RequestBody<'updateRssFeed'>, options?: RequestOptions): Promise<ResponseBody<'updateRssFeed'>> {
    return this.http.patch(`/rss-feeds/${segment(id)}`, body, options);
  }

  delete(id: string, options?: RequestOptions): Promise<ResponseBody<'deleteRssFeed'>> {
    return this.http.delete(`/rss-feeds/${segment(id)}`, options);
  }

  items(
    id: string,
    query?: QueryParams<'listRssFeedItems'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'listRssFeedItems'>> {
    return this.http.get(`/rss-feeds/${segment(id)}/items`, query, options);
  }

  pause(id: string, options?: RequestOptions): Promise<ResponseBody<'pauseRssFeed'>> {
    return this.http.post(`/rss-feeds/${segment(id)}/pause`, undefined, options);
  }

  resume(id: string, options?: RequestOptions): Promise<ResponseBody<'resumeRssFeed'>> {
    return this.http.post(`/rss-feeds/${segment(id)}/resume`, undefined, options);
  }

  checkNow(id: string, options?: RequestOptions): Promise<ResponseBody<'checkRssFeedNow'>> {
    return this.http.post(`/rss-feeds/${segment(id)}/check`, undefined, options);
  }
}
