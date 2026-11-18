import { AdaptlyPost } from '../src/index.js';
import { fakeFetch, json, noSleep } from './fake-fetch.js';

const client = (fetch: typeof globalThis.fetch) => new AdaptlyPost({ apiKey: 'adaptly_test', fetch, sleep: noSleep });

describe('listAll', () => {
  it('walks posts page by page with offsets', async () => {
    const { fetch, calls } = fakeFetch(
      () => json(200, { posts: [{ id: 'p1' }, { id: 'p2' }], total: 3, hasMore: true }),
      () => json(200, { posts: [{ id: 'p3' }], total: 3, hasMore: false }),
    );

    const ids: (string | undefined)[] = [];
    for await (const post of client(fetch).posts.listAll({ limit: 2 })) ids.push(post.id);

    expect(ids).toEqual(['p1', 'p2', 'p3']);
    expect(calls.map((call) => call.url.searchParams.get('offset'))).toEqual(['0', '2']);
  });

  it('follows inbox cursors until the last page', async () => {
    const { fetch, calls } = fakeFetch(
      () => json(200, { comments: [{ id: 'c1' }], hasMore: true, nextCursor: 'next-1' }),
      () => json(200, { comments: [{ id: 'c2' }], hasMore: false, nextCursor: null }),
    );

    const ids: (string | undefined)[] = [];
    for await (const comment of client(fetch).inbox.comments.listAll({ limit: 1 })) ids.push(comment.id);

    expect(ids).toEqual(['c1', 'c2']);
    expect(calls.map((call) => call.url.searchParams.get('cursor'))).toEqual([null, 'next-1']);
  });
});

describe('media.upload', () => {
  it('asks for upload URLs, puts the bytes and returns the public URL', async () => {
    const { fetch, calls } = fakeFetch(
      () =>
        json(201, {
          urls: [
            {
              fileName: 'photo.jpg',
              uploadUrl: 'https://uploads.example.com/put/photo.jpg?sig=1',
              publicUrl: 'https://cdn.adaptlypost.com/photo.jpg',
              key: 'k1',
            },
          ],
        }),
      () => new Response(null, { status: 200 }),
    );

    const uploaded = await client(fetch).media.upload({
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      data: new Uint8Array([1, 2, 3]),
    });

    expect(uploaded).toEqual([{ fileName: 'photo.jpg', publicUrl: 'https://cdn.adaptlypost.com/photo.jpg', key: 'k1' }]);
    expect(calls[0]?.body).toEqual({ files: [{ fileName: 'photo.jpg', mimeType: 'image/jpeg' }] });
    expect(calls[1]?.method).toBe('PUT');
    expect(calls[1]?.url.toString()).toBe('https://uploads.example.com/put/photo.jpg?sig=1');
    expect(calls[1]?.headers.get('content-type')).toBe('image/jpeg');
    expect(calls[1]?.headers.get('authorization')).toBeNull();
  });
});

describe('ai.waitForImage', () => {
  it('polls the job until it completes', async () => {
    const { fetch, calls } = fakeFetch(
      () => json(200, { jobId: 'j1', status: 'generating' }),
      () => json(200, { jobId: 'j1', status: 'completed', imageUrl: 'https://cdn.adaptlypost.com/i.png' }),
    );

    const job = await client(fetch).ai.waitForImage('j1', { intervalMs: 1 });

    expect(job.imageUrl).toBe('https://cdn.adaptlypost.com/i.png');
    expect(calls).toHaveLength(2);
  });

  it('throws the reason of a failed job', async () => {
    const { fetch } = fakeFetch(() => json(200, { jobId: 'j1', status: 'failed', error: 'Prompt refused' }));

    await expect(client(fetch).ai.waitForImage('j1')).rejects.toThrow('Prompt refused');
  });
});

describe('connectLinks', () => {
  it('creates a direct link with a return URL', async () => {
    const { fetch, calls } = fakeFetch(() =>
      json(201, { url: 'https://adaptlypost.com/connect/tok', token: 'tok', startUrls: [] }),
    );

    await client(fetch).connectLinks.create({ allowedPlatforms: ['INSTAGRAM'], returnUrl: 'https://app.example.com/back' });

    expect(calls[0]?.url.pathname).toBe('/post/api/v1/connect-links');
    expect(calls[0]?.body).toEqual({ allowedPlatforms: ['INSTAGRAM'], returnUrl: 'https://app.example.com/back' });
  });

  it('escapes path segments', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { success: true }));

    await client(fetch).connectLinks.revoke('a/b');

    expect(calls[0]?.url.pathname).toBe('/post/api/v1/connect-links/a%2Fb');
  });
});

describe('workspaces', () => {
  it('creates a workspace', async () => {
    const { fetch, calls } = fakeFetch(() =>
      json(201, {
        id: 'w2',
        name: 'Client B',
        description: null,
        organizationId: 'o1',
        isDefault: false,
        connectionLimit: 5,
        createdAt: '2026-11-18T09:00:00Z',
      }),
    );

    const workspace = await client(fetch).workspaces.create({ name: 'Client B', connectionLimit: 5 });

    expect(workspace.id).toBe('w2');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url.pathname).toBe('/post/api/v1/workspaces');
    expect(calls[0]?.body).toEqual({ name: 'Client B', connectionLimit: 5 });
  });

  it('deletes a workspace', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { success: true }));

    await client(fetch).workspaces.delete('w/2');

    expect(calls[0]?.method).toBe('DELETE');
    expect(calls[0]?.url.pathname).toBe('/post/api/v1/workspaces/w%2F2');
  });
});

describe('members', () => {
  it('lists the members of the workspace', async () => {
    const { fetch, calls } = fakeFetch(() =>
      json(200, {
        members: [
          {
            userId: 'u1',
            email: 'ana@example.com',
            firstName: 'Ana',
            lastName: null,
            role: 'editor',
            organizationRoles: ['org-member'],
            joinedAt: '2026-11-01T09:00:00Z',
          },
        ],
      }),
    );

    const { members } = await client(fetch).members.list();

    expect(members.map((member) => member.role)).toEqual(['editor']);
    expect(calls[0]?.url.pathname).toBe('/post/api/v1/members');
  });

  it('removes a member from the workspace', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { success: true }));

    await client(fetch).members.remove('u1');

    expect(calls[0]?.method).toBe('DELETE');
    expect(calls[0]?.url.pathname).toBe('/post/api/v1/members/u1');
  });

  it('removes a member from the organization', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { success: true }));

    await client(fetch).members.removeFromOrganization('u1');

    expect(calls[0]?.method).toBe('DELETE');
    expect(calls[0]?.url.pathname).toBe('/post/api/v1/organization/members/u1');
  });
});

describe('invitations', () => {
  const invitation = {
    id: 'i1',
    email: 'ana@example.com',
    organizationId: 'o1',
    organizationRole: 'org-member',
    status: 'pending',
    workspaces: [{ workspaceId: 'w1', workspaceName: 'Main', role: 'editor' }],
    expiresAt: '2026-11-25T09:00:00Z',
    createdAt: '2026-11-18T09:00:00Z',
  };

  it('sends an invitation', async () => {
    const { fetch, calls } = fakeFetch(() => json(201, invitation));

    const sent = await client(fetch).invitations.send({
      email: 'ana@example.com',
      workspaces: [{ workspaceId: 'w1', role: 'editor' }],
      creditAllowance: { mode: 'MONTHLY', monthlyAmount: 100 },
    });

    expect(sent.status).toBe('pending');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url.pathname).toBe('/post/api/v1/invitations');
    expect(calls[0]?.body).toEqual({
      email: 'ana@example.com',
      workspaces: [{ workspaceId: 'w1', role: 'editor' }],
      creditAllowance: { mode: 'MONTHLY', monthlyAmount: 100 },
    });
  });

  it('lists invitations with paging', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { invitations: [invitation], total: 1, hasMore: false }));

    const { invitations } = await client(fetch).invitations.list({ limit: 10, offset: 5 });

    expect(invitations).toHaveLength(1);
    expect(calls[0]?.url.searchParams.get('limit')).toBe('10');
    expect(calls[0]?.url.searchParams.get('offset')).toBe('5');
  });

  it('walks every invitation with offsets', async () => {
    const { fetch, calls } = fakeFetch(
      () => json(200, { invitations: [invitation], total: 2, hasMore: true }),
      () => json(200, { invitations: [{ ...invitation, id: 'i2' }], total: 2, hasMore: false }),
    );

    const ids: string[] = [];
    for await (const item of client(fetch).invitations.listAll({ limit: 1 })) ids.push(item.id);

    expect(ids).toEqual(['i1', 'i2']);
    expect(calls.map((call) => call.url.searchParams.get('offset'))).toEqual(['0', '1']);
  });

  it('revokes an invitation', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { ...invitation, status: 'revoked' }));

    const revoked = await client(fetch).invitations.revoke('i1');

    expect(revoked.status).toBe('revoked');
    expect(calls[0]?.method).toBe('DELETE');
    expect(calls[0]?.url.pathname).toBe('/post/api/v1/invitations/i1');
  });
});
