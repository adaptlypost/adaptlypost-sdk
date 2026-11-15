import { PostValidationError, parseConnectReturn } from '../src/index.js';
import type { CreatePostRequest, ResponseBody, Schemas , AdaptlyPost} from '../src/index.js';

export const readmeExamples = async (adaptly: AdaptlyPost, body: CreatePostRequest, bytes: Uint8Array) => {
  const { accounts = [] } = await adaptly.accounts.list();
  const accountIds = accounts.flatMap((account) => (account.id ? [account.id] : []));
  const created = await adaptly.posts.create({
    content: 'Hello from the SDK',
    accountIds,
    scheduledAt: '2026-12-01T09:00:00Z',
    timezone: 'Europe/Warsaw',
  });
  await adaptly.posts.publish(created.postId ?? '', { timezone: 'UTC', publishNow: true });
  await adaptly.posts.retry(created.postId ?? '');
  const [photo] = await adaptly.media.upload({ fileName: 'launch.jpg', mimeType: 'image/jpeg', data: bytes });
  await adaptly.posts.create({ content: 'We launched', accountIds, mediaUrls: [photo?.publicUrl ?? ''] });
  const link = await adaptly.connectLinks.create({ allowedPlatforms: ['INSTAGRAM'], returnUrl: 'https://app.example.com' });
  const start: string | undefined = link.startUrls?.[0]?.url;
  const result = parseConnectReturn('https://app.example.com?status=connected');
  const ids: string[] | undefined = result?.accountIds;
  const { caption } = await adaptly.ai.generateCaption({ prompt: 'Launch post', platform: 'LINKEDIN' });
  const { jobId } = await adaptly.ai.generateImage({ prompt: 'A rocket made of paper' });
  const image = await adaptly.ai.waitForImage(jobId ?? '');
  try {
    await adaptly.posts.create(body);
  } catch (error) {
    if (error instanceof PostValidationError) for (const issue of error.issues) console.log(issue.platform, issue.code);
  }
  const webhook: Schemas['Webhook'] | undefined = undefined;
  const createdType: ResponseBody<'createPost'> = created;
  return { start, ids, caption, image, webhook, createdType };
};
