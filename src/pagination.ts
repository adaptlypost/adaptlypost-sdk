export interface OffsetPage {
  hasMore?: boolean;
}

export interface CursorPage {
  hasMore?: boolean;
  nextCursor?: string | null;
}

export const paginate = {
  async *byOffset<Page extends OffsetPage, Item>(
    fetchPage: (offset: number) => Promise<Page>,
    itemsOf: (page: Page) => Item[] | undefined,
  ): AsyncGenerator<Item> {
    for (let offset = 0; ; ) {
      const page = await fetchPage(offset);
      const items = itemsOf(page) ?? [];
      yield* items;
      if (!page.hasMore || items.length === 0) return;
      offset += items.length;
    }
  },

  async *byPage<Page extends OffsetPage, Item>(
    fetchPage: (page: number) => Promise<Page>,
    itemsOf: (page: Page) => Item[] | undefined,
  ): AsyncGenerator<Item> {
    for (let pageNumber = 1; ; pageNumber += 1) {
      const page = await fetchPage(pageNumber);
      const items = itemsOf(page) ?? [];
      yield* items;
      if (!page.hasMore || items.length === 0) return;
    }
  },

  async *byCursor<Page extends CursorPage, Item>(
    fetchPage: (cursor: string | undefined) => Promise<Page>,
    itemsOf: (page: Page) => Item[] | undefined,
  ): AsyncGenerator<Item> {
    for (let cursor: string | undefined; ; ) {
      const page = await fetchPage(cursor);
      yield* itemsOf(page) ?? [];
      if (!page.hasMore || !page.nextCursor) return;
      cursor = page.nextCursor;
    }
  },
};
