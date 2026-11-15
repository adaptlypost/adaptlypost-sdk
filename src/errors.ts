import type { PostIssue } from './types.js';

const fieldOf = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null ? Reflect.get(body, key) : undefined;

const stringField = (body: unknown, key: string): string | undefined => {
  const value = fieldOf(body, key);
  return typeof value === 'string' ? value : undefined;
};

const messageOf = (status: number, body: unknown): string => {
  const message = fieldOf(body, 'message');
  if (typeof message === 'string' && message !== '') return message;
  if (Array.isArray(message) && message.length > 0) return message.join('; ');
  if (typeof body === 'string' && body !== '') return body;
  return `Request failed with status ${status}`;
};

export class AdaptlyPostError extends Error {
  override name = 'AdaptlyPostError';
}

export interface ApiErrorDetails {
  status: number;
  body: unknown;
  headers: Headers;
  method: string;
  path: string;
}

export class APIError extends AdaptlyPostError {
  override name = 'APIError';
  readonly status: number;
  readonly code: string | undefined;
  readonly body: unknown;
  readonly headers: Headers;
  readonly requestId: string | undefined;
  readonly method: string;
  readonly path: string;

  constructor(details: ApiErrorDetails) {
    super(messageOf(details.status, details.body));
    this.status = details.status;
    this.code = stringField(details.body, 'code');
    this.body = details.body;
    this.headers = details.headers;
    this.requestId = details.headers.get('x-request-id') ?? undefined;
    this.method = details.method;
    this.path = details.path;
  }
}

export class BadRequestError extends APIError {
  override name = 'BadRequestError';
}

export class PostValidationError extends BadRequestError {
  override name = 'PostValidationError';
  readonly issues: PostIssue[];

  constructor(details: ApiErrorDetails) {
    super(details);
    const issues = fieldOf(details.body, 'issues');
    this.issues = Array.isArray(issues) ? issues : [];
  }
}

export class AuthenticationError extends APIError {
  override name = 'AuthenticationError';
}

export class InsufficientCreditsError extends APIError {
  override name = 'InsufficientCreditsError';
}

export class PermissionDeniedError extends APIError {
  override name = 'PermissionDeniedError';
  readonly requiredPermission: string | undefined;

  constructor(details: ApiErrorDetails) {
    super(details);
    this.requiredPermission = stringField(details.body, 'requiredPermission');
  }
}

export class NotFoundError extends APIError {
  override name = 'NotFoundError';
}

export class ConflictError extends APIError {
  override name = 'ConflictError';
}

export class RateLimitError extends APIError {
  override name = 'RateLimitError';
}

export class InternalServerError extends APIError {
  override name = 'InternalServerError';
}

export class APIConnectionError extends AdaptlyPostError {
  override name = 'APIConnectionError';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class APITimeoutError extends APIConnectionError {
  override name = 'APITimeoutError';
}

export class WebhookVerificationError extends AdaptlyPostError {
  override name = 'WebhookVerificationError';
}

export const POST_VALIDATION_FAILED = 'post_validation_failed';

export const errorFromResponse = (details: ApiErrorDetails): APIError => {
  const { status } = details;
  if (status === 400) {
    return stringField(details.body, 'code') === POST_VALIDATION_FAILED
      ? new PostValidationError(details)
      : new BadRequestError(details);
  }
  if (status === 401) return new AuthenticationError(details);
  if (status === 402) return new InsufficientCreditsError(details);
  if (status === 403) return new PermissionDeniedError(details);
  if (status === 404) return new NotFoundError(details);
  if (status === 409) return new ConflictError(details);
  if (status === 429) return new RateLimitError(details);
  if (status >= 500) return new InternalServerError(details);
  return new APIError(details);
};
