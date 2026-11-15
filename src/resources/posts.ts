import type { HttpClient, RequestOptions } from '../http.js';
import { paginate } from '../pagination.js';
import type { QueryParams, RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

type ListPostsQuery = QueryParams<'listPosts'>;
type ListedPost = NonNullable<ResponseBody<'listPosts'>['posts']>[number];

export class Posts {
  constructor(private readonly http: HttpClient) {}

  create(body: RequestBody<'createPost'>, options?: RequestOptions): Promise<ResponseBody<'createPost'>> {
    return this.http.post('/social-posts', body, options);
  }

  validate(body: RequestBody<'validatePost'>, options?: RequestOptions): Promise<ResponseBody<'validatePost'>> {
    return this.http.post('/social-posts/validate', body, options);
  }

  bulkSchedule(
    body: RequestBody<'bulkSchedulePosts'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'bulkSchedulePosts'>> {
    return this.http.post('/social-posts/bulk', body, options);
  }

  validateBulk(
    body: RequestBody<'validateBulkPosts'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'validateBulkPosts'>> {
    return this.http.post('/social-posts/bulk/validate', body, options);
  }

  list(query?: ListPostsQuery, options?: RequestOptions): Promise<ResponseBody<'listPosts'>> {
    return this.http.get('/social-posts', query, options);
  }

  listAll(query?: Omit<ListPostsQuery, 'offset'>, options?: RequestOptions): AsyncGenerator<ListedPost> {
    return paginate.byOffset(
      (offset) => this.list({ ...query, offset }, options),
      (page) => page.posts,
    );
  }

  get(id: string, options?: RequestOptions): Promise<ResponseBody<'getPost'>> {
    return this.http.get(`/social-posts/${segment(id)}`, undefined, options);
  }

  update(id: string, body: RequestBody<'updatePost'>, options?: RequestOptions): Promise<ResponseBody<'updatePost'>> {
    return this.http.patch(`/social-posts/${segment(id)}`, body, options);
  }

  delete(id: string, options?: RequestOptions): Promise<ResponseBody<'deletePost'>> {
    return this.http.delete(`/social-posts/${segment(id)}`, options);
  }

  results(id: string, options?: RequestOptions): Promise<ResponseBody<'getPostResults'>> {
    return this.http.get(`/social-posts/${segment(id)}/results`, undefined, options);
  }

  publish(id: string, body: RequestBody<'publishDraft'>, options?: RequestOptions): Promise<ResponseBody<'publishDraft'>> {
    return this.http.post(`/social-posts/${segment(id)}/publish`, body, options);
  }

  unschedule(id: string, options?: RequestOptions): Promise<ResponseBody<'unschedulePost'>> {
    return this.http.post(`/social-posts/${segment(id)}/unschedule`, undefined, options);
  }

  retry(
    id: string,
    body: RequestBody<'retryFailedPlatforms'> = {},
    options?: RequestOptions,
  ): Promise<ResponseBody<'retryFailedPlatforms'>> {
    return this.http.post(`/social-posts/${segment(id)}/retry`, body, options);
  }
}
