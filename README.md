# @adaptlypost/sdk

TypeScript client for the [AdaptlyPost](https://adaptlypost.com) API: posts, media, connected accounts, connect links, inbox, webhooks, analytics, AI, workspaces and team members. Every request and response type comes from the API's OpenAPI document, so the editor knows each field and the compiler catches a wrong one.

It runs on Node 20.3+, Bun, Deno, edge runtimes and the browser, with no dependencies.

```sh
npm install @adaptlypost/sdk
```

## Quick start

```ts
import { AdaptlyPost } from '@adaptlypost/sdk';

const adaptly = new AdaptlyPost({ apiKey: process.env.ADAPTLYPOST_API_KEY });

const { accounts } = await adaptly.accounts.list();
console.log(accounts);

const { postId } = await adaptly.posts.create({
  text: 'Hello from the SDK',
  contentType: 'TEXT',
  accountIds: ['<account id from the list>'],
  scheduledAt: '2026-12-01T09:00:00Z',
  timezone: 'Europe/Warsaw',
});
```

Create a key under **Settings → API tokens**. `new AdaptlyPost()` with no `apiKey` reads `ADAPTLYPOST_API_KEY`. A key carries the workspace role it was created with: `adaptly.me()` returns the role and every permission the key holds.

## Options

| Option        | Default                                    | What it does                                                     |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `apiKey`      | `ADAPTLYPOST_API_KEY`                      | API key or OAuth access token                                    |
| `workspaceId` | the key's workspace                        | Sent as `X-Workspace-Id` on every call                           |
| `language`    | none                                       | Language of error messages (`en`, `fr`, `de`, `es`, `pt`, `it`)  |
| `timeoutMs`   | `60000`                                    | Per attempt                                                      |
| `maxRetries`  | `2`                                        | Retries on 429, and on 502, 503, 504 and network errors for reads |
| `baseUrl`     | `https://post.adaptlypost.com/post/api/v1` |                                                                  |
| `fetch`       | `globalThis.fetch`                         | Your own fetch, for proxies or tests                             |

Every method also takes a last `options` argument with `workspaceId`, `timeoutMs`, `maxRetries`, `signal` and `headers` for that one call.

An OAuth token reaches every workspace its member belongs to. List them with `adaptly.workspaces.list()` and pick one per client with `adaptly.withWorkspace(id)`.

Creates are never retried after a 5xx, because the post may already exist. A 429 is always retried, after the `Retry-After` the API sends.

## Posts

```ts
const report = await adaptly.posts.validate(body);
const created = await adaptly.posts.create(body);

for await (const post of adaptly.posts.listAll({ statuses: ['SCHEDULED'] })) {
  console.log(post.id, post.scheduledAt);
}

await adaptly.posts.publish(created.postId, { timezone: 'UTC', publishNow: true });
await adaptly.posts.retry(created.postId);

const { labels } = await adaptly.labels.list();
const acme = labels.find((label) => label.name === 'Acme');
if (acme) {
  await adaptly.posts.update(created.postId, { labelIds: [acme.id] });
}

await adaptly.posts.setLabels(created.postId, { labelIds: [] });
```

`validate` runs every check a create runs and returns the problems without creating anything. Labels are created in the AdaptlyPost app. `labels.list` returns their ids for `labelIds` on create and update, where an update with `labelIds` replaces the labels of the post and `[]` removes them. `posts.setLabels` replaces the labels of a post in any status, a published one included. Labels never reach a platform. `posts.list({ labelIds })` returns the posts carrying any of them. `listAll` pages through the results for you. So do `recurringPosts.listAll`, `analytics.postsAll` and the inbox `listAll` methods.

## Media

```ts
import { readFile } from 'node:fs/promises';

const [photo] = await adaptly.media.upload({
  fileName: 'launch.jpg',
  mimeType: 'image/jpeg',
  data: await readFile('launch.jpg'),
});

await adaptly.posts.create({
  text: 'We launched',
  contentType: 'IMAGE',
  timezone: 'UTC',
  accountIds,
  mediaUrls: [photo.publicUrl],
});
```

`upload` asks for presigned URLs and sends the bytes straight to storage. It takes a `Blob`, an `ArrayBuffer` or a `Uint8Array` (a Node `Buffer` works), or an array of files.

## Connect your clients' accounts

Put your own "Connect Instagram" buttons in your app. Create a link with a `returnUrl`, send the client to a start URL, and read the result when they come back:

```ts
const link = await adaptly.connectLinks.create({
  allowedPlatforms: ['INSTAGRAM'],
  returnUrl: 'https://app.example.com/social/connected?client=42',
});

redirect(link.startUrls[0].url);
```

```ts
import { parseConnectReturn } from '@adaptlypost/sdk';

const result = parseConnectReturn(request.url);
if (result?.status === 'connected') {
  await saveAccounts(clientId, result.accountIds);
} else if (result) {
  showError(result.message ?? result.error);
}
```

The client sees the network's own consent screen, and the tokens stay with AdaptlyPost. `accountIds` are the same ids `accounts.list()` returns. A Facebook or LinkedIn page pick that connects several accounts returns several ids.

## Workspaces and team

```ts
const workspace = await adaptly.workspaces.create({ name: 'Client B', connectionLimit: 10 });

const invitation = await adaptly.invitations.send({
  email: 'ana@example.com',
  workspaces: [{ workspaceId: workspace.id, role: 'editor' }],
});

const { members } = await adaptly.withWorkspace(workspace.id).members.list();
```

| Method                                    | What it does                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `workspaces.create(body)`                 | Creates a workspace. Every organization owner and admin becomes its admin    |
| `workspaces.delete(id)`                   | Deletes a workspace and everything in it                                     |
| `members.list()`                          | Members of the workspace the call acts in, with their roles                  |
| `members.remove(userId)`                  | Removes someone from this workspace only. They stay in the organization      |
| `members.removeFromOrganization(userId)`  | Removes someone from the organization and every workspace in it              |
| `invitations.send(body)`                  | Emails an invitation that lasts 7 days                                       |
| `invitations.list(query)` / `listAll()`   | Invitations that include this workspace, newest first                        |
| `invitations.revoke(id)`                  | Revokes a pending invitation                                                 |

Creating or deleting a workspace needs an Admin key (`workspace.manage`). Listing members needs `members.read`, and the other member and invitation calls need `members.manage`. Creating or deleting a workspace and removing someone from the organization also need a key created by an organization owner or admin.

Removing someone revokes their API keys and connect links. The API refuses to delete the default workspace, the last one, or one with connected social accounts. It also refuses to remove a member's last workspace, so remove them from the organization instead. When the plan has no room for another workspace or team seat, the call throws a `PermissionDeniedError` with `code` `subscription_required`.

## Webhooks

```ts
import { constructWebhookEvent } from '@adaptlypost/sdk';

app.post('/webhooks/adaptlypost', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = await constructWebhookEvent({
    payload: req.body,
    signature: req.header('x-adaptly-signature'),
    timestamp: req.header('x-adaptly-timestamp'),
    secret: process.env.ADAPTLYPOST_WEBHOOK_SECRET,
  });
  console.log(event.event, event.data);
  res.sendStatus(200);
});
```

Verify against the raw body, before any JSON parser touches it. Deliveries older than five minutes fail verification. Change that with `toleranceSeconds`. `verifyWebhookSignature` returns a boolean instead of throwing.

## AI

```ts
const { caption } = await adaptly.ai.generateCaption({ prompt: 'Launch post for our new app', platform: 'LINKEDIN' });

const { jobId } = await adaptly.ai.generateImage({ prompt: 'A rocket made of paper' });
const image = await adaptly.ai.waitForImage(jobId);
```

Each call spends AI credits. `waitForImage` polls every 2 seconds for up to 3 minutes.

## Errors

Every failure is an `AdaptlyPostError`. A response from the API is an `APIError` with `status`, `code`, `body` and `requestId`. The subclasses let you catch what you can act on:

| Class                      | When                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `PostValidationError`      | A post was refused. `issues` lists every problem, per platform       |
| `BadRequestError`          | Any other 400                                                        |
| `AuthenticationError`      | 401: missing, revoked or expired key                                 |
| `InsufficientCreditsError` | 402: out of AI credits                                               |
| `PermissionDeniedError`    | 403. `code` is `permission_denied` (see `requiredPermission`), `subscription_required` or `workspace_access_denied` |
| `NotFoundError`            | 404                                                                  |
| `ConflictError`            | 409                                                                  |
| `RateLimitError`           | 429 after the retries ran out                                        |
| `InternalServerError`      | 5xx                                                                  |
| `APIConnectionError`       | The API could not be reached. `APITimeoutError` when it timed out    |

```ts
try {
  await adaptly.posts.create(body);
} catch (error) {
  if (error instanceof PostValidationError) {
    for (const issue of error.issues) console.log(issue.platform, issue.code, issue.message);
  } else throw error;
}
```

## Types

Every request and response type is exported, along with the raw generated `paths`, `operations` and `components`:

```ts
import type { Post, CreatePostRequest, Schemas, RequestBody, ResponseBody } from '@adaptlypost/sdk';

type Webhook = Schemas['Webhook'];
type CreatedPost = ResponseBody<'createPost'>;
```

## Development

`npm run generate` downloads the OpenAPI document from production and rewrites `src/generated/openapi.ts`. Run it when the API changes, then `npm run typecheck` shows every method the change affects.

```sh
npm run generate && npm run typecheck && npm test && npm run build
```

## Releasing

Bump `version` in `package.json`, commit, and push a tag with a leading `v`, such as `v0.2.0`. The release workflow type-checks, tests, builds and publishes to npm through trusted publishing, so no npm token lives in the repository.
