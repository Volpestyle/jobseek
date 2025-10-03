export const ANONYMOUS_ACCESS_COOKIE_NAME = "anonymous-token";
export const ANONYMOUS_REFRESH_COOKIE_NAME = "anonymous-refresh";

export const ANONYMOUS_ACCESS_TOKEN_TTL = 60 * 60 * 24; // 1 day in seconds
export const ANONYMOUS_REFRESH_TOKEN_TTL = ANONYMOUS_ACCESS_TOKEN_TTL * 7; // 7 days in seconds
