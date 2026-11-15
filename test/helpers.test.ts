import { createHmac } from 'node:crypto';
import {
  ConnectReturnStatus,
  WebhookVerificationError,
  constructWebhookEvent,
  parseConnectReturn,
  verifyWebhookSignature,
} from '../src/index.js';

describe('parseConnectReturn', () => {
  it('reads a connected return with its accounts', () => {
    expect(
      parseConnectReturn(
        'https://app.example.com/back?client=42&status=connected&platform=FACEBOOK&accountId=page-1&accountId=page-2',
      ),
    ).toEqual({
      status: ConnectReturnStatus.CONNECTED,
      platform: 'FACEBOOK',
      error: undefined,
      message: undefined,
      accountIds: ['page-1', 'page-2'],
    });
  });

  it('reads an error return from search params', () => {
    expect(parseConnectReturn(new URLSearchParams('status=error&error=cancelled&platform=YOUTUBE'))).toMatchObject({
      status: ConnectReturnStatus.ERROR,
      error: 'cancelled',
      accountIds: [],
    });
  });

  it('answers null for a URL that is not a connect return', () => {
    expect(parseConnectReturn('https://app.example.com/back?client=42')).toBeNull();
  });
});

describe('webhook signatures', () => {
  const secret = 'whsec_test';
  const payload = JSON.stringify({ id: 'evt_1', event: 'post.published', data: {} });
  const timestamp = '1763236800';
  const now = () => Number(timestamp) * 1000;
  const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;

  it('accepts the signature AdaptlyPost sends', async () => {
    await expect(verifyWebhookSignature({ payload, signature, timestamp, secret, now })).resolves.toBe(true);
  });

  it('refuses a body that was changed', async () => {
    await expect(
      verifyWebhookSignature({ payload: `${payload} `, signature, timestamp, secret, now }),
    ).resolves.toBe(false);
  });

  it('refuses an old delivery', async () => {
    await expect(
      verifyWebhookSignature({ payload, signature, timestamp, secret, now: () => now() + 600_000 }),
    ).resolves.toBe(false);
  });

  it('parses a verified event and throws on a forged one', async () => {
    await expect(constructWebhookEvent({ payload, signature, timestamp, secret, now })).resolves.toMatchObject({
      event: 'post.published',
    });
    await expect(
      constructWebhookEvent({ payload, signature: 'sha256=00', timestamp, secret, now }),
    ).rejects.toBeInstanceOf(WebhookVerificationError);
  });
});
