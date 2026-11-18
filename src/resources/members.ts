import type { HttpClient, RequestOptions } from '../http.js';
import type { ResponseBody } from '../types.js';
import { segment } from './path.js';

export class Members {
  constructor(private readonly http: HttpClient) {}

  list(options?: RequestOptions): Promise<ResponseBody<'listMembers'>> {
    return this.http.get('/members', undefined, options);
  }

  remove(userId: string, options?: RequestOptions): Promise<ResponseBody<'removeMember'>> {
    return this.http.delete(`/members/${segment(userId)}`, options);
  }

  removeFromOrganization(userId: string, options?: RequestOptions): Promise<ResponseBody<'removeOrganizationMember'>> {
    return this.http.delete(`/organization/members/${segment(userId)}`, options);
  }
}
