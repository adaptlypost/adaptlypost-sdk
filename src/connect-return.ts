import type { PlatformType } from './types.js';

export enum ConnectReturnStatus {
  CONNECTED = 'connected',
  ERROR = 'error',
}

export enum ConnectReturnParam {
  STATUS = 'status',
  PLATFORM = 'platform',
  ERROR = 'error',
  MESSAGE = 'message',
  ACCOUNT_ID = 'accountId',
}

export interface ConnectReturn {
  status: ConnectReturnStatus;
  platform: PlatformType | undefined;
  error: string | undefined;
  message: string | undefined;
  accountIds: string[];
}

const RETURN_STATUSES: ReadonlySet<string> = new Set(Object.values(ConnectReturnStatus));

const isReturnStatus = (value: string | null): value is ConnectReturnStatus => value !== null && RETURN_STATUSES.has(value);

const paramsOf = (input: string | URL | URLSearchParams): URLSearchParams => {
  if (input instanceof URLSearchParams) return input;
  if (input instanceof URL) return input.searchParams;
  return URL.canParse(input) ? new URL(input).searchParams : new URLSearchParams(input);
};

export const parseConnectReturn = (input: string | URL | URLSearchParams): ConnectReturn | null => {
  const params = paramsOf(input);
  const status = params.get(ConnectReturnParam.STATUS);
  if (!isReturnStatus(status)) return null;
  return {
    status,
    platform: (params.get(ConnectReturnParam.PLATFORM) ?? undefined) as PlatformType | undefined,
    error: params.get(ConnectReturnParam.ERROR) ?? undefined,
    message: params.get(ConnectReturnParam.MESSAGE) ?? undefined,
    accountIds: params.getAll(ConnectReturnParam.ACCOUNT_ID),
  };
};
