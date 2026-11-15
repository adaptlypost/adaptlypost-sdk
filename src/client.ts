import { HttpClient, resolveClientOptions, type ClientOptions, type RequestOptions } from './http.js';
import { Accounts } from './resources/accounts.js';
import { Ai } from './resources/ai.js';
import { Analytics } from './resources/analytics.js';
import { ConnectLinks } from './resources/connect-links.js';
import { Inbox } from './resources/inbox.js';
import { Media } from './resources/media.js';
import { Posts } from './resources/posts.js';
import { RecurringPosts } from './resources/recurring-posts.js';
import { RssFeeds } from './resources/rss-feeds.js';
import { Webhooks } from './resources/webhooks.js';
import { Workspaces } from './resources/workspaces.js';
import type { ResponseBody } from './types.js';

export class AdaptlyPost {
  readonly posts: Posts;
  readonly recurringPosts: RecurringPosts;
  readonly rssFeeds: RssFeeds;
  readonly accounts: Accounts;
  readonly media: Media;
  readonly connectLinks: ConnectLinks;
  readonly inbox: Inbox;
  readonly webhooks: Webhooks;
  readonly analytics: Analytics;
  readonly ai: Ai;
  readonly workspaces: Workspaces;

  private readonly http: HttpClient;

  constructor(private readonly options: ClientOptions = {}) {
    this.http = new HttpClient(resolveClientOptions(options));
    this.posts = new Posts(this.http);
    this.recurringPosts = new RecurringPosts(this.http);
    this.rssFeeds = new RssFeeds(this.http);
    this.accounts = new Accounts(this.http);
    this.media = new Media(this.http);
    this.connectLinks = new ConnectLinks(this.http);
    this.inbox = new Inbox(this.http);
    this.webhooks = new Webhooks(this.http);
    this.analytics = new Analytics(this.http);
    this.ai = new Ai(this.http);
    this.workspaces = new Workspaces(this.http);
  }

  me(options?: RequestOptions): Promise<ResponseBody<'getMe'>> {
    return this.http.get('/me', undefined, options);
  }

  withWorkspace(workspaceId: string): AdaptlyPost {
    return new AdaptlyPost({ ...this.options, apiKey: this.http.config.apiKey, workspaceId });
  }
}
