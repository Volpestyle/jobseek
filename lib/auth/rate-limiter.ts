import {
  getUserFromRequest,
  RequestContext,
  toRequestContext,
} from "./auth-utils";
import { parseRefreshTokenCookie } from "./anonymous";
import { ANONYMOUS_REFRESH_COOKIE_NAME } from "./anonymous.constants";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const shouldDisableRateLimiting =
  process.env.DISABLE_RATE_LIMITS === "true" ||
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY;

let docClient: DynamoDBDocumentClient | null = null;
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "jobseek-users-dev";

if (!shouldDisableRateLimiting) {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  docClient = DynamoDBDocumentClient.from(client);
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "Rate limiting is disabled because AWS credentials are missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to enable it."
  );
}

const isProduction = process.env.NODE_ENV === "production";

function resolvePositiveInt(key: string, fallback: number): number {
  const rawValue = process.env[key];
  if (!rawValue) return fallback;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    console.warn(
      `Ignoring invalid numeric value for ${key}. Expected positive integer, received:`,
      rawValue
    );
    return fallback;
  }

  return Math.floor(value);
}

const ANON_SESSION_DEFAULT_MAX = isProduction ? 30 : 500;
const ANON_SESSION_DEFAULT_WINDOW = 60 * 60 * 1000; // 1 hour
const ANON_SESSION_MAX = resolvePositiveInt(
  "RATE_LIMIT_ANON_SESSION_MAX",
  ANON_SESSION_DEFAULT_MAX
);
const ANON_SESSION_WINDOW = resolvePositiveInt(
  "RATE_LIMIT_ANON_SESSION_WINDOW_MS",
  ANON_SESSION_DEFAULT_WINDOW
);

const ANON_REFRESH_DEFAULT_MAX = isProduction ? 240 : 1000;
const ANON_REFRESH_DEFAULT_WINDOW = 5 * 60 * 1000; // 5 minutes
const ANON_REFRESH_MAX = resolvePositiveInt(
  "RATE_LIMIT_ANON_REFRESH_MAX",
  ANON_REFRESH_DEFAULT_MAX
);
const ANON_REFRESH_WINDOW = resolvePositiveInt(
  "RATE_LIMIT_ANON_REFRESH_WINDOW_MS",
  ANON_REFRESH_DEFAULT_WINDOW
);

type Tier = "anonymous" | "authenticated" | "premium";
type LimitType = "session" | "search" | "apply";

type RateLimitMatrix = Record<Tier, Record<LimitType, RateLimitConfig>>;

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

// Premium tier configuration
export const RATE_LIMIT_TIERS: RateLimitMatrix = {
  anonymous: {
    session: {
      windowMs: ANON_SESSION_WINDOW,
      maxRequests: ANON_SESSION_MAX,
    },
    search: { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 searches/hour
    apply: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 20 }, // 20 applications/day
  },
  authenticated: {
    session: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 sessions/hour
    search: { windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100 searches/hour
    apply: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 50 }, // 50 applications/day
  },
  premium: {
    session: { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 sessions/hour
    search: { windowMs: 60 * 60 * 1000, maxRequests: 500 }, // 500 searches/hour
    apply: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 200 }, // 200 applications/day
  },
};

const ANONYMOUS_TOKEN_RATE_LIMIT: RateLimitConfig = {
  windowMs: ANON_SESSION_WINDOW,
  maxRequests: ANON_SESSION_MAX,
};

const ANONYMOUS_REFRESH_RATE_LIMIT: RateLimitConfig = {
  windowMs: ANON_REFRESH_WINDOW,
  maxRequests: ANON_REFRESH_MAX,
};

function getClientIdentifier(request: Request | RequestContext): string {
  const context = toRequestContext(request);
  return (
    context.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    context.headers.get("x-real-ip") ||
    context.ip ||
    "unknown"
  );
}

// Check if user has premium subscription
async function isPremiumUser(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  try {
    const { dynamodbService } = await import("@/lib/db/dynamodb.service");
    const profile = await dynamodbService.getUserProfile(userId);

    // Check if user has active premium subscription
    if (profile?.subscriptionTier === "premium" && profile.subscriptionExpiry) {
      const expiryDate = new Date(profile.subscriptionExpiry);
      return expiryDate > new Date();
    }

    return false;
  } catch (error) {
    console.error("Error checking premium status:", error);
    return false;
  }
}

// Single table rate limit check
async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;

  const client = docClient;
  if (!client) {
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime,
    };
  }

  // Use identifier as userId and construct dataType for rate limit
  const userId = identifier;
  const dataType = `RATE_LIMIT#${windowStart}`;

  try {
    // Try to get existing rate limit entry
    const getCommand = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType,
      },
    });

    const { Item } = await client.send(getCommand);

    if (!Item) {
      // Create new entry
      const putCommand = new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          userId,
          dataType,
          count: 1,
          resetTime,
          ttl: Math.floor(resetTime / 1000) + 3600, // TTL 1 hour after reset
          createdAt: new Date().toISOString(),
        },
        ConditionExpression:
          "attribute_not_exists(userId) AND attribute_not_exists(dataType)",
      });

      try {
        await client.send(putCommand);
        return {
          allowed: true,
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          resetTime,
        };
      } catch (error) {
        if (isConditionalCheckFailed(error)) {
          // Another request created it first, retry
          return checkRateLimit(identifier, config);
        }
        throw error;
      }
    }

    // Check if limit exceeded
    if (Item.count >= config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: Item.resetTime,
      };
    }

    // Increment count atomically
    const updateCommand = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType,
      },
      UpdateExpression: "SET #count = #count + :inc",
      ExpressionAttributeNames: {
        "#count": "count",
      },
      ExpressionAttributeValues: {
        ":inc": 1,
        ":max": config.maxRequests,
      },
      ConditionExpression: "#count < :max",
      ReturnValues: "ALL_NEW",
    });

    try {
      const { Attributes } = await client.send(updateCommand);
      const updatedCount =
        typeof Attributes?.count === "number" ? Attributes.count : 0;
      const updatedResetTime =
        typeof Attributes?.resetTime === "number"
          ? Attributes.resetTime
          : resetTime;

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - updatedCount,
        resetTime: updatedResetTime,
      };
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        // Limit exceeded
        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: Item.resetTime,
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime,
    };
  }
}

function isConditionalCheckFailed(error: unknown): error is { name: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "ConditionalCheckFailedException"
  );
}

// Get rate limit config based on user tier
async function getRateLimitConfig(
  request: Request | RequestContext,
  limitType: "session" | "search" | "apply"
): Promise<{ identifier: string; config: RateLimitConfig }> {
  const context = toRequestContext(request);
  const userInfo = await getUserFromRequest(context);

  if (!userInfo) {
    // No user identified, use IP-based fallback
    const ip =
      context.headers.get("x-forwarded-for") ||
      context.headers.get("x-real-ip") ||
      "unknown";
    return {
      identifier: `${limitType}:ip:${ip}`,
      config: RATE_LIMIT_TIERS.anonymous[limitType],
    };
  }

  if (userInfo.isAuthenticated && userInfo.userId) {
    // Authenticated user
    const isPremium = await isPremiumUser(userInfo.userId);
    const tier = isPremium ? "premium" : "authenticated";

    return {
      identifier: `${limitType}:user:${userInfo.userId}`,
      config: RATE_LIMIT_TIERS[tier][limitType],
    };
  } else {
    // Anonymous user with token
    return {
      identifier: `${limitType}:${userInfo.userId}`,
      config: RATE_LIMIT_TIERS.anonymous[limitType],
    };
  }
}

// Rate limiter for session creation
export async function checkSessionRateLimit(
  request: Request | RequestContext
): Promise<RateLimitResult> {
  const context = toRequestContext(request);
  const { identifier, config } = await getRateLimitConfig(context, "session");
  return checkRateLimit(identifier, config);
}

// Rate limiter for search operations
export async function checkSearchRateLimit(
  request: Request | RequestContext
): Promise<RateLimitResult> {
  const context = toRequestContext(request);
  const { identifier, config } = await getRateLimitConfig(context, "search");
  return checkRateLimit(identifier, config);
}

// Rate limiter for job applications
export async function checkApplyRateLimit(
  request: Request | RequestContext
): Promise<RateLimitResult> {
  const context = toRequestContext(request);
  const { identifier, config } = await getRateLimitConfig(context, "apply");
  return checkRateLimit(identifier, config);
}

export async function checkAnonymousTokenIssueRateLimit(
  request: Request | RequestContext
): Promise<RateLimitResult> {
  const identifier = `anon-token:${getClientIdentifier(request)}`;
  return checkRateLimit(identifier, ANONYMOUS_TOKEN_RATE_LIMIT);
}

export async function checkAnonymousTokenRefreshRateLimit(
  request: Request | RequestContext
): Promise<RateLimitResult> {
  const context = toRequestContext(request);
  const refreshCookie = context.cookies?.get(ANONYMOUS_REFRESH_COOKIE_NAME)?.value;
  const parsed = parseRefreshTokenCookie(refreshCookie);

  const identifier = parsed
    ? `anon-refresh:${parsed.anonymousId}`
    : `anon-refresh-ip:${getClientIdentifier(context)}`;

  return checkRateLimit(identifier, ANONYMOUS_REFRESH_RATE_LIMIT);
}
