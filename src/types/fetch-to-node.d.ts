declare module 'fetch-to-node' {
  import { IncomingMessage, ServerResponse } from 'http';

  export function toReqRes(request: Request): {
    req: IncomingMessage;
    res: ServerResponse;
  };

  export function toFetchResponse(response: ServerResponse): Response;
}
