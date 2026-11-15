export interface RecordedCall {
  url: URL;
  method: string;
  headers: Headers;
  body: unknown;
}

export type Responder = (call: RecordedCall) => Response | Promise<Response>;

export const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

export const fakeFetch = (...responders: Responder[]) => {
  const calls: RecordedCall[] = [];
  const queue = [...responders];
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call: RecordedCall = {
      url: new URL(String(input)),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    };
    calls.push(call);
    const responder = queue.length > 1 ? queue.shift() : queue[0];
    if (!responder) throw new Error(`No response for ${call.method} ${call.url}`);
    return responder(call);
  };
  return { fetch, calls };
};

export const noSleep = (): Promise<void> => Promise.resolve();
