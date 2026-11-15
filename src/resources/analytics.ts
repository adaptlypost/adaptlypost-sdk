import type { HttpClient, RequestOptions } from '../http.js';
import { paginate } from '../pagination.js';
import type { QueryParams, ResponseBody } from '../types.js';

type ListedPostAnalytics = NonNullable<ResponseBody<'listPostAnalytics'>['posts']>[number];

export class Analytics {
  constructor(private readonly http: HttpClient) {}

  overview(query: QueryParams<'getAnalyticsOverview'>, options?: RequestOptions): Promise<ResponseBody<'getAnalyticsOverview'>> {
    return this.http.get('/analytics/overview', query, options);
  }

  timeseries(
    query: QueryParams<'getAnalyticsTimeseries'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'getAnalyticsTimeseries'>> {
    return this.http.get('/analytics/timeseries', query, options);
  }

  platformBreakdown(
    query: QueryParams<'getAnalyticsPlatformBreakdown'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'getAnalyticsPlatformBreakdown'>> {
    return this.http.get('/analytics/platform-breakdown', query, options);
  }

  posts(query: QueryParams<'listPostAnalytics'>, options?: RequestOptions): Promise<ResponseBody<'listPostAnalytics'>> {
    return this.http.get('/analytics/posts', query, options);
  }

  postsAll(query: Omit<QueryParams<'listPostAnalytics'>, 'page'>, options?: RequestOptions): AsyncGenerator<ListedPostAnalytics> {
    return paginate.byPage(
      (page) => this.posts({ ...query, page }, options),
      (page) => page.posts,
    );
  }

  topPosts(query: QueryParams<'listTopPosts'>, options?: RequestOptions): Promise<ResponseBody<'listTopPosts'>> {
    return this.http.get('/analytics/top-posts', query, options);
  }

  discoveredPosts(
    query: QueryParams<'listDiscoveredPosts'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'listDiscoveredPosts'>> {
    return this.http.get('/analytics/discovered-posts', query, options);
  }

  syncStatus(options?: RequestOptions): Promise<ResponseBody<'getAnalyticsSyncStatus'>> {
    return this.http.get('/analytics/sync-status', undefined, options);
  }

  sync(options?: RequestOptions): Promise<ResponseBody<'triggerAnalyticsSync'>> {
    return this.http.post('/analytics/sync', undefined, options);
  }
}
