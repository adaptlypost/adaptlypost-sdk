import type { HttpClient, RequestOptions } from '../http.js';
import type { QueryParams, ResponseBody } from '../types.js';
import { segment } from './path.js';

export class Accounts {
  constructor(private readonly http: HttpClient) {}

  list(options?: RequestOptions): Promise<ResponseBody<'listSocialAccounts'>> {
    return this.http.get('/social-accounts', undefined, options);
  }

  check(id: string, options?: RequestOptions): Promise<ResponseBody<'checkSocialAccount'>> {
    return this.http.post(`/social-accounts/${segment(id)}/check`, undefined, options);
  }

  remove(id: string, options?: RequestOptions): Promise<ResponseBody<'removeSocialAccount'>> {
    return this.http.delete(`/social-accounts/${segment(id)}`, options);
  }

  instagramAudio(
    id: string,
    query: QueryParams<'searchInstagramAudio'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'searchInstagramAudio'>> {
    return this.http.get(`/social-accounts/${segment(id)}/instagram-audio`, query, options);
  }

  pinterestBoards(id: string, options?: RequestOptions): Promise<ResponseBody<'getPinterestBoards'>> {
    return this.http.get(`/social-accounts/${segment(id)}/pinterest-boards`, undefined, options);
  }

  youtubePlaylists(id: string, options?: RequestOptions): Promise<ResponseBody<'getYouTubePlaylists'>> {
    return this.http.get(`/social-accounts/${segment(id)}/youtube-playlists`, undefined, options);
  }

  wordpressCategories(id: string, options?: RequestOptions): Promise<ResponseBody<'getWordPressCategories'>> {
    return this.http.get(`/social-accounts/${segment(id)}/wordpress-categories`, undefined, options);
  }

  lookupLinkedInOrganization(
    query: QueryParams<'lookupLinkedInOrganization'>,
    options?: RequestOptions,
  ): Promise<ResponseBody<'lookupLinkedInOrganization'>> {
    return this.http.get('/linkedin-organizations/lookup', query, options);
  }
}
