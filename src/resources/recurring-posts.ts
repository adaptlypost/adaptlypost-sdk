import type { HttpClient, RequestOptions } from '../http.js';
import { paginate } from '../pagination.js';
import type { QueryParams, ResponseBody } from '../types.js';
import { segment } from './path.js';

type ListRecurringPostsQuery = QueryParams<'listRecurringPosts'>;
type ListedRecurringPost = NonNullable<ResponseBody<'listRecurringPosts'>['recurringPosts']>[number];

export class RecurringPosts {
  constructor(private readonly http: HttpClient) {}

  list(query?: ListRecurringPostsQuery, options?: RequestOptions): Promise<ResponseBody<'listRecurringPosts'>> {
    return this.http.get('/recurring-posts', query, options);
  }

  listAll(query?: Omit<ListRecurringPostsQuery, 'offset'>, options?: RequestOptions): AsyncGenerator<ListedRecurringPost> {
    return paginate.byOffset(
      (offset) => this.list({ ...query, offset }, options),
      (page) => page.recurringPosts,
    );
  }

  get(id: string, options?: RequestOptions): Promise<ResponseBody<'getRecurringPost'>> {
    return this.http.get(`/recurring-posts/${segment(id)}`, undefined, options);
  }

  delete(id: string, options?: RequestOptions): Promise<ResponseBody<'deleteRecurringPost'>> {
    return this.http.delete(`/recurring-posts/${segment(id)}`, options);
  }

  pause(id: string, options?: RequestOptions): Promise<ResponseBody<'pauseRecurringPost'>> {
    return this.http.post(`/recurring-posts/${segment(id)}/pause`, undefined, options);
  }

  resume(id: string, options?: RequestOptions): Promise<ResponseBody<'resumeRecurringPost'>> {
    return this.http.post(`/recurring-posts/${segment(id)}/resume`, undefined, options);
  }
}
