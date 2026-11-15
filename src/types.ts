import type { components, operations } from './generated/openapi.js';

export type Schemas = components['schemas'];

export type OperationId = keyof operations;

type JsonContent<T> = T extends { content: { 'application/json': infer Body } } ? Body : never;

export type RequestBody<K extends OperationId> = operations[K] extends { requestBody: infer Body }
  ? JsonContent<Body>
  : operations[K] extends { requestBody?: infer Body }
    ? JsonContent<NonNullable<Body>>
    : never;

export type QueryParams<K extends OperationId> = operations[K]['parameters'] extends { query?: infer Query }
  ? NonNullable<Query>
  : never;

type SuccessContent<Responses> = Responses extends { 200: infer Success }
  ? JsonContent<Success>
  : Responses extends { 201: infer Success }
    ? JsonContent<Success>
    : Responses extends { 202: infer Success }
      ? JsonContent<Success>
      : undefined;

export type ResponseBody<K extends OperationId> = SuccessContent<operations[K]['responses']>;

export type PlatformType = Schemas['PlatformType'];
export type PostStatus = Schemas['PostStatus'];
export type Post = Schemas['Post'];
export type CreatePostRequest = Schemas['CreateSocialPostRequest'];
export type UpdatePostRequest = Schemas['UpdateSocialPostRequest'];
export type PostIssue = Schemas['PostIssue'];
export type PostValidationReport = Schemas['PostValidationReport'];
export type RecurringPost = Schemas['RecurringPost'];
export type RssFeed = Schemas['RssFeed'];
export type Webhook = Schemas['Webhook'];
export type WebhookEventName = Schemas['WebhookEventName'];
export type WebhookEventPayload = Schemas['WebhookEventPayload'];
export type InboxComment = Schemas['InboxComment'];
export type InboxMention = Schemas['InboxMention'];
export type InboxConversation = Schemas['InboxConversation'];
export type InboxMessage = Schemas['InboxMessage'];
export type InboxReview = Schemas['InboxReview'];
export type WorkspacePermission = Schemas['WorkspacePermission'];
export type ImageJob = Schemas['ImageJobResponse'];
export type UploadMimeType = RequestBody<'getUploadUrls'>['files'][number]['mimeType'];
