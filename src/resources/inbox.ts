import type { HttpClient, RequestOptions } from '../http.js';
import { paginate } from '../pagination.js';
import type { QueryParams, RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

type Listed<K extends 'listInboxComments' | 'listInboxMentions' | 'listInboxConversations' | 'listInboxReviews', Field extends keyof ResponseBody<K>> =
  NonNullable<ResponseBody<K>[Field]> extends readonly (infer Item)[] ? Item : never;

export class InboxComments {
  constructor(private readonly http: HttpClient) {}

  list(query?: QueryParams<'listInboxComments'>, options?: RequestOptions): Promise<ResponseBody<'listInboxComments'>> {
    return this.http.get('/inbox/comments', query, options);
  }

  listAll(
    query?: Omit<QueryParams<'listInboxComments'>, 'cursor'>,
    options?: RequestOptions,
  ): AsyncGenerator<Listed<'listInboxComments', 'comments'>> {
    return paginate.byCursor(
      (cursor) => this.list({ ...query, cursor }, options),
      (page) => page.comments,
    );
  }

  get(id: string, options?: RequestOptions): Promise<ResponseBody<'getInboxComment'>> {
    return this.http.get(`/inbox/comments/${segment(id)}`, undefined, options);
  }

  delete(id: string, options?: RequestOptions): Promise<ResponseBody<'deleteInboxComment'>> {
    return this.http.delete(`/inbox/comments/${segment(id)}`, options);
  }

  reply(id: string, body: RequestBody<'replyToInboxComment'>, options?: RequestOptions): Promise<ResponseBody<'replyToInboxComment'>> {
    return this.http.post(`/inbox/comments/${segment(id)}/reply`, body, options);
  }

  hide(id: string, options?: RequestOptions): Promise<ResponseBody<'hideInboxComment'>> {
    return this.http.post(`/inbox/comments/${segment(id)}/hide`, undefined, options);
  }

  unhide(id: string, options?: RequestOptions): Promise<ResponseBody<'unhideInboxComment'>> {
    return this.http.post(`/inbox/comments/${segment(id)}/unhide`, undefined, options);
  }

  like(id: string, options?: RequestOptions): Promise<ResponseBody<'likeInboxComment'>> {
    return this.http.post(`/inbox/comments/${segment(id)}/like`, undefined, options);
  }

  unlike(id: string, options?: RequestOptions): Promise<ResponseBody<'unlikeInboxComment'>> {
    return this.http.delete(`/inbox/comments/${segment(id)}/like`, options);
  }

  updateStatus(
    body: RequestBody<'updateInboxCommentsStatus'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'updateInboxCommentsStatus'>> {
    return this.http.post('/inbox/comments/status', body, options);
  }
}

export class InboxMentions {
  constructor(private readonly http: HttpClient) {}

  list(query?: QueryParams<'listInboxMentions'>, options?: RequestOptions): Promise<ResponseBody<'listInboxMentions'>> {
    return this.http.get('/inbox/mentions', query, options);
  }

  listAll(
    query?: Omit<QueryParams<'listInboxMentions'>, 'cursor'>,
    options?: RequestOptions,
  ): AsyncGenerator<Listed<'listInboxMentions', 'mentions'>> {
    return paginate.byCursor(
      (cursor) => this.list({ ...query, cursor }, options),
      (page) => page.mentions,
    );
  }

  reply(id: string, body: RequestBody<'replyToInboxMention'>, options?: RequestOptions): Promise<ResponseBody<'replyToInboxMention'>> {
    return this.http.post(`/inbox/mentions/${segment(id)}/reply`, body, options);
  }

  updateStatus(
    body: RequestBody<'updateInboxMentionsStatus'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'updateInboxMentionsStatus'>> {
    return this.http.post('/inbox/mentions/status', body, options);
  }
}

export class InboxConversations {
  constructor(private readonly http: HttpClient) {}

  list(
    query?: QueryParams<'listInboxConversations'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'listInboxConversations'>> {
    return this.http.get('/inbox/conversations', query, options);
  }

  listAll(
    query?: Omit<QueryParams<'listInboxConversations'>, 'cursor'>,
    options?: RequestOptions,
  ): AsyncGenerator<Listed<'listInboxConversations', 'conversations'>> {
    return paginate.byCursor(
      (cursor) => this.list({ ...query, cursor }, options),
      (page) => page.conversations,
    );
  }

  get(id: string, options?: RequestOptions): Promise<ResponseBody<'getInboxConversation'>> {
    return this.http.get(`/inbox/conversations/${segment(id)}`, undefined, options);
  }

  sendMessage(id: string, body: RequestBody<'sendInboxMessage'>, options?: RequestOptions): Promise<ResponseBody<'sendInboxMessage'>> {
    return this.http.post(`/inbox/conversations/${segment(id)}/messages`, body, options);
  }

  deleteMessage(id: string, messageId: string, options?: RequestOptions): Promise<ResponseBody<'deleteInboxMessage'>> {
    return this.http.delete(`/inbox/conversations/${segment(id)}/messages/${segment(messageId)}`, options);
  }

  updateStatus(
    body: RequestBody<'updateInboxConversationsStatus'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'updateInboxConversationsStatus'>> {
    return this.http.post('/inbox/conversations/status', body, options);
  }
}

export class InboxReviews {
  constructor(private readonly http: HttpClient) {}

  list(query?: QueryParams<'listInboxReviews'>, options?: RequestOptions): Promise<ResponseBody<'listInboxReviews'>> {
    return this.http.get('/inbox/reviews', query, options);
  }

  listAll(
    query?: Omit<QueryParams<'listInboxReviews'>, 'cursor'>,
    options?: RequestOptions,
  ): AsyncGenerator<Listed<'listInboxReviews', 'reviews'>> {
    return paginate.byCursor(
      (cursor) => this.list({ ...query, cursor }, options),
      (page) => page.reviews,
    );
  }

  reply(id: string, body: RequestBody<'replyToInboxReview'>, options?: RequestOptions): Promise<ResponseBody<'replyToInboxReview'>> {
    return this.http.put(`/inbox/reviews/${segment(id)}/reply`, body, options);
  }

  deleteReply(id: string, options?: RequestOptions): Promise<ResponseBody<'deleteInboxReviewReply'>> {
    return this.http.delete(`/inbox/reviews/${segment(id)}/reply`, options);
  }

  updateStatus(
    body: RequestBody<'updateInboxReviewsStatus'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'updateInboxReviewsStatus'>> {
    return this.http.post('/inbox/reviews/status', body, options);
  }
}

export class Inbox {
  readonly comments: InboxComments;
  readonly mentions: InboxMentions;
  readonly conversations: InboxConversations;
  readonly reviews: InboxReviews;

  constructor(private readonly http: HttpClient) {
    this.comments = new InboxComments(http);
    this.mentions = new InboxMentions(http);
    this.conversations = new InboxConversations(http);
    this.reviews = new InboxReviews(http);
  }

  summary(options?: RequestOptions): Promise<ResponseBody<'getInboxSummary'>> {
    return this.http.get('/inbox/summary', undefined, options);
  }

  refresh(options?: RequestOptions): Promise<ResponseBody<'refreshInbox'>> {
    return this.http.post('/inbox/refresh', undefined, options);
  }
}
