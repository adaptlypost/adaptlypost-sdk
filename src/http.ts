import { APIConnectionError, APIError, APITimeoutError, AdaptlyPostError, errorFromResponse } from './errors.js';

export const DEFAULT_BASE_URL = 'https://post.adaptlypost.com/post/api/v1';
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_RETRIES = 2;
export const MAX_RETRY_DELAY_MS = 60_000;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_BACKOFF_MS = 8_000;
const RETRYABLE_SERVER_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);
const IDEMPOTENT_METHODS: ReadonlySet<HttpMethod> = new Set(['GET', 'PUT', 'DELETE']);

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | readonly (string | number)[] | null | undefined;

export type Query = { readonly [key: string]: QueryValue };

export interface RequestOptions {
  workspaceId?: string;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  workspaceId?: string;
  language?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface ResolvedClientOptions {
  apiKey: string;
  baseUrl: string;
  workspaceId: string | undefined;
  language: string | undefined;
  timeoutMs: number;
  maxRetries: number;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
}

interface HttpRequest {
  method: HttpMethod;
  path: string;
  query?: Query;
  body?: unknown;
  options?: RequestOptions;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const envApiKey = (): string | undefined =>
  typeof process === 'undefined' ? undefined : process.env['ADAPTLYPOST_API_KEY'];

export const resolveClientOptions = (options: ClientOptions): ResolvedClientOptions => {
  const apiKey = options.apiKey ?? envApiKey();
  if (!apiKey) {
    throw new AdaptlyPostError('Pass apiKey to new AdaptlyPost() or set ADAPTLYPOST_API_KEY');
  }
  return {
    apiKey,
    baseUrl: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
    workspaceId: options.workspaceId,
    language: options.language,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    sleep: options.sleep ?? defaultSleep,
  };
};

export const buildUrl = (baseUrl: string, path: string, query?: Query): string => {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    const values = typeof value === 'object' ? value : [value];
    for (const item of values) url.searchParams.append(key, String(item));
  }
  return url.toString();
};

export const parseRetryAfter = (header: string | null, now: number): number | undefined => {
  if (!header) return undefined;
  const value = header.trim();
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};

const backoffDelay = (attempt: number): number => {
  const base = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_BACKOFF_MS);
  return Math.round(base * (0.75 + Math.random() * 0.5));
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isAbort = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

export class HttpClient {
  constructor(readonly config: ResolvedClientOptions) {}

  get<T>(path: string, query?: Query, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'GET', path, query, options });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'POST', path, body, options });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PUT', path, body, options });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body, options });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'DELETE', path, options });
  }

  async putFile(url: string, data: Blob | ArrayBuffer | Uint8Array, contentType: string, signal?: AbortSignal): Promise<void> {
    const response = await this.config
      .fetch(url, {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body: data instanceof Uint8Array ? Uint8Array.from(data) : data,
        signal,
      })
      .catch((error: unknown) => {
        throw new APIConnectionError(`Could not upload the file: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error,
        });
      });
    if (!response.ok) {
      throw new APIError({
        status: response.status,
        body: await parseBody(response),
        headers: response.headers,
        method: 'PUT',
        path: new URL(url).pathname,
      });
    }
  }

  async request<T>({ method, path, query, body, options = {} }: HttpRequest): Promise<T> {
    const url = buildUrl(this.config.baseUrl, path, query);
    const workspaceId = options.workspaceId ?? this.config.workspaceId;
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.config.apiKey}`,
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
      ...(this.config.language ? { 'x-language': this.config.language } : {}),
      ...options.headers,
    };
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const idempotent = IDEMPOTENT_METHODS.has(method);

    for (let attempt = 0; ; attempt += 1) {
      const timeout = AbortSignal.timeout(timeoutMs);
      const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
      const canRetry = attempt < maxRetries;

      let response: Response;
      try {
        response = await this.config.fetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal,
        });
      } catch (error) {
        if (options.signal?.aborted) throw error;
        const failure = timeout.aborted
          ? new APITimeoutError(`${method} ${path} timed out after ${timeoutMs}ms`, { cause: error })
          : new APIConnectionError(
              `Could not reach ${url}: ${error instanceof Error && !isAbort(error) ? error.message : String(error)}`,
              { cause: error },
            );
        if (!idempotent || !canRetry) throw failure;
        await this.config.sleep(backoffDelay(attempt));
        continue;
      }

      if (response.ok) return (await parseBody(response)) as T;

      const failure = errorFromResponse({
        status: response.status,
        body: await parseBody(response),
        headers: response.headers,
        method,
        path,
      });
      const retryable =
        response.status === 429 || (idempotent && RETRYABLE_SERVER_STATUSES.has(response.status));
      if (!retryable || !canRetry) throw failure;

      const delay = parseRetryAfter(response.headers.get('retry-after'), Date.now()) ?? backoffDelay(attempt);
      if (delay > MAX_RETRY_DELAY_MS) throw failure;
      await this.config.sleep(delay);
    }
  }
}
