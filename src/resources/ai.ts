import { APITimeoutError, AdaptlyPostError } from '../errors.js';
import type { HttpClient, RequestOptions } from '../http.js';
import type { ImageJob, RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

export const IMAGE_POLL_INTERVAL_MS = 2_000;
export const IMAGE_WAIT_TIMEOUT_MS = 180_000;
const FINISHED_IMAGE_STATUSES: ReadonlySet<ImageJob['status']> = new Set(['completed', 'failed']);

export interface WaitForImageOptions extends RequestOptions {
  intervalMs?: number;
  waitTimeoutMs?: number;
}

export class Ai {
  constructor(private readonly http: HttpClient) {}

  generateCaption(body: RequestBody<'generateCaption'>, options?: RequestOptions): Promise<ResponseBody<'generateCaption'>> {
    return this.http.post('/ai/captions', body, options);
  }

  refineCaption(body: RequestBody<'refineCaption'>, options?: RequestOptions): Promise<ResponseBody<'refineCaption'>> {
    return this.http.post('/ai/captions/refine', body, options);
  }

  generateImage(body: RequestBody<'generateImage'>, options?: RequestOptions): Promise<ResponseBody<'generateImage'>> {
    return this.http.post('/ai/images', body, options);
  }

  getImageJob(jobId: string, options?: RequestOptions): Promise<ResponseBody<'getImageJob'>> {
    return this.http.get(`/ai/images/${segment(jobId)}`, undefined, options);
  }

  async waitForImage(jobId: string, options: WaitForImageOptions = {}): Promise<ImageJob> {
    const { intervalMs = IMAGE_POLL_INTERVAL_MS, waitTimeoutMs = IMAGE_WAIT_TIMEOUT_MS, ...requestOptions } = options;
    const deadline = Date.now() + waitTimeoutMs;
    for (;;) {
      const job = await this.getImageJob(jobId, requestOptions);
      if (job.status && FINISHED_IMAGE_STATUSES.has(job.status)) {
        if (job.status === 'failed') throw new AdaptlyPostError(job.error ?? `Image job ${jobId} failed`);
        return job;
      }
      if (Date.now() + intervalMs > deadline) {
        throw new APITimeoutError(`Image job ${jobId} did not finish within ${waitTimeoutMs}ms`);
      }
      await this.http.config.sleep(intervalMs);
    }
  }
}
