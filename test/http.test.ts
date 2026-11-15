import {
  APITimeoutError,
  AdaptlyPost,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  PostValidationError,
  RateLimitError,
} from '../src/index.js';
import { fakeFetch, json, noSleep } from './fake-fetch.js';

const client = (fetch: typeof globalThis.fetch, options: { maxRetries?: number; timeoutMs?: number } = {}) =>
  new AdaptlyPost({ apiKey: 'adaptly_test', fetch, sleep: noSleep, language: 'de', ...options });

describe('requests', () => {
  it('sends the key, the language and the workspace, and spreads array query params', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { posts: [], total: 0, hasMore: false }));

    await client(fetch).withWorkspace('ws_1').posts.list({ statuses: ['DRAFT', 'SCHEDULED'], limit: 10 });

    const [call] = calls;
    expect(call?.url.toString()).toBe(
      'https://post.adaptlypost.com/post/api/v1/social-posts?statuses=DRAFT&statuses=SCHEDULED&limit=10',
    );
    expect(call?.headers.get('authorization')).toBe('Bearer adaptly_test');
    expect(call?.headers.get('x-workspace-id')).toBe('ws_1');
    expect(call?.headers.get('x-language')).toBe('de');
  });

  it('lets one call pick another workspace', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { accounts: [] }));

    await client(fetch).accounts.list({ workspaceId: 'ws_2' });

    expect(calls[0]?.headers.get('x-workspace-id')).toBe('ws_2');
  });

  it('refuses to start without a key', () => {
    const previous = process.env['ADAPTLYPOST_API_KEY'];
    delete process.env['ADAPTLYPOST_API_KEY'];
    expect(() => new AdaptlyPost({ fetch: fakeFetch().fetch })).toThrow(/apiKey/);
    if (previous !== undefined) process.env['ADAPTLYPOST_API_KEY'] = previous;
  });
});

describe('retries', () => {
  it('waits out a 429 and tries again', async () => {
    const sleeps: number[] = [];
    const { fetch, calls } = fakeFetch(
      () => json(429, { message: 'Slow down' }, { 'retry-after': '2' }),
      () => json(200, { accounts: [] }),
    );

    const result = await new AdaptlyPost({
      apiKey: 'adaptly_test',
      fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    }).accounts.list();

    expect(result).toEqual({ accounts: [] });
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([2000]);
  });

  it('retries a 503 on a read', async () => {
    const { fetch, calls } = fakeFetch(
      () => json(503, { message: 'Unavailable' }),
      () => json(200, { webhooks: [] }),
    );

    await client(fetch).webhooks.list();

    expect(calls).toHaveLength(2);
  });

  it('never retries a 503 on a create, which may have gone through', async () => {
    const { fetch, calls } = fakeFetch(() => json(503, { message: 'Unavailable' }));

    await expect(client(fetch).posts.create({ text: 'Hi', contentType: 'TEXT', timezone: 'UTC', accountIds: ['acc_1'] })).rejects.toBeInstanceOf(
      InternalServerError,
    );
    expect(calls).toHaveLength(1);
  });

  it('gives up after the last retry', async () => {
    const { fetch, calls } = fakeFetch(() => json(429, { message: 'Slow down' }));

    await expect(client(fetch, { maxRetries: 2 }).accounts.list()).rejects.toBeInstanceOf(RateLimitError);
    expect(calls).toHaveLength(3);
  });

  it('reports a request that ran out of time', async () => {
    const hang = (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });

    await expect(client(hang, { timeoutMs: 5, maxRetries: 0 }).accounts.list()).rejects.toBeInstanceOf(APITimeoutError);
  });
});

describe('errors', () => {
  it('lists every problem of a refused post', async () => {
    const issues = [{ code: 'TEXT_TOO_LONG', severity: 'ERROR', message: 'Too long', platform: 'TWITTER' }];
    const { fetch } = fakeFetch(() =>
      json(400, { statusCode: 400, code: 'post_validation_failed', message: 'Invalid post', issues }),
    );

    const failure = await client(fetch)
      .posts.create({ text: 'x'.repeat(400), contentType: 'TEXT', timezone: 'UTC', accountIds: ['acc_1'] })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PostValidationError);
    expect(failure).toMatchObject({ status: 400, code: 'post_validation_failed', issues, message: 'Invalid post' });
  });

  it('names the permission a role is missing', async () => {
    const { fetch } = fakeFetch(() =>
      json(403, { statusCode: 403, code: 'permission_denied', requiredPermission: 'posts.publish', message: 'No' }),
    );

    await expect(client(fetch).posts.publish('post_1', { timezone: 'UTC' })).rejects.toMatchObject({
      constructor: PermissionDeniedError,
      code: 'permission_denied',
      requiredPermission: 'posts.publish',
    });
  });

  it('joins a list of validation messages', async () => {
    const { fetch } = fakeFetch(() => json(401, { statusCode: 401, message: ['first', 'second'] }));

    await expect(client(fetch).me()).rejects.toMatchObject({
      constructor: AuthenticationError,
      message: 'first; second',
    });
  });
});
