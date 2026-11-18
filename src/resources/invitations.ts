import type { HttpClient, RequestOptions } from '../http.js';
import { paginate } from '../pagination.js';
import type { QueryParams, RequestBody, ResponseBody } from '../types.js';
import { segment } from './path.js';

type ListInvitationsQuery = QueryParams<'listInvitations'>;
type ListedInvitation = ResponseBody<'listInvitations'>['invitations'][number];

export class Invitations {
  constructor(private readonly http: HttpClient) {}

  list(query?: ListInvitationsQuery, options?: RequestOptions): Promise<ResponseBody<'listInvitations'>> {
    return this.http.get('/invitations', query, options);
  }

  listAll(query?: Omit<ListInvitationsQuery, 'offset'>, options?: RequestOptions): AsyncGenerator<ListedInvitation> {
    return paginate.byOffset(
      (offset) => this.list({ ...query, offset }, options),
      (page) => page.invitations,
    );
  }

  send(body: RequestBody<'sendInvitation'>, options?: RequestOptions): Promise<ResponseBody<'sendInvitation'>> {
    return this.http.post('/invitations', body, options);
  }

  revoke(id: string, options?: RequestOptions): Promise<ResponseBody<'revokeInvitation'>> {
    return this.http.delete(`/invitations/${segment(id)}`, options);
  }
}
