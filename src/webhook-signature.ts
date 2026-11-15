import { WebhookVerificationError } from './errors.js';
import type { WebhookEventPayload } from './types.js';

export const WEBHOOK_SIGNATURE_HEADER = 'x-adaptly-signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'x-adaptly-timestamp';
export const WEBHOOK_EVENT_HEADER = 'x-adaptly-event';
export const WEBHOOK_ID_HEADER = 'x-adaptly-webhook-id';
export const WEBHOOK_SIGNATURE_PREFIX = 'sha256=';
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface VerifyWebhookOptions {
  payload: string | Uint8Array;
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  secret: string;
  toleranceSeconds?: number;
  now?: () => number;
}

const encoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');

const sameText = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

const payloadText = (payload: string | Uint8Array): string =>
  typeof payload === 'string' ? payload : new TextDecoder().decode(payload);

export const signWebhookPayload = async (secret: string, timestamp: string, payload: string | Uint8Array): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payloadText(payload)}`));
  return `${WEBHOOK_SIGNATURE_PREFIX}${toHex(digest)}`;
};

export const verifyWebhookSignature = async (options: VerifyWebhookOptions): Promise<boolean> => {
  const { signature, timestamp, secret, payload } = options;
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
  const nowSeconds = Math.floor((options.now?.() ?? Date.now()) / 1000);
  const tolerance = options.toleranceSeconds ?? WEBHOOK_TOLERANCE_SECONDS;
  if (Math.abs(nowSeconds - Number(timestamp)) > tolerance) return false;
  return sameText(await signWebhookPayload(secret, timestamp, payload), signature);
};

export const constructWebhookEvent = async (options: VerifyWebhookOptions): Promise<WebhookEventPayload> => {
  if (!(await verifyWebhookSignature(options))) {
    throw new WebhookVerificationError('The webhook signature or timestamp does not match');
  }
  return JSON.parse(payloadText(options.payload));
};
