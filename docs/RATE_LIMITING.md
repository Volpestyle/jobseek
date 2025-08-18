# Rate Limiting System Documentation

## Overview

JobSeek uses a persistent, tier-based rate limiting system built on DynamoDB. Rate limits are applied per user/session and vary based on subscription tier.

## How It Works

### 1. Time Window Calculation

Rate limits use fixed time windows that align to boundaries:

- **Hourly limits**: Align to the start of each hour (e.g., 2:00 PM, 3:00 PM)
- **Daily limits**: Align to midnight UTC

```typescript
const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
const resetTime = windowStart + config.windowMs;
```

### 2. Storage Structure

Rate limits are stored in the main `jobseek-users` DynamoDB table using composite keys:

| userId              | dataType                   | count | resetTime     | ttl        |
| ------------------- | -------------------------- | ----- | ------------- | ---------- |
| `search:user:123`   | `RATE_LIMIT#1704067200000` | 45    | 1704070800000 | 1704074400 |
| `apply:anon:abc123` | `RATE_LIMIT#1704067200000` | 12    | 1704153600000 | 1704157200 |

- **userId**: Identifier format: `{limitType}:{userType}:{id}`
- **dataType**: Always `RATE_LIMIT#{windowStart}`
- **count**: Number of requests in current window
- **resetTime**: When this window expires (milliseconds)
- **ttl**: DynamoDB TTL for automatic cleanup (seconds)

### 3. User Identification

#### Anonymous Users

- Identified by a hash of: IP address + User-Agent + Accept-Language
- Format: `session:anon:{hash}`, `search:anon:{hash}`, etc.

#### Authenticated Users

- Identified by their user ID from NextAuth session
- Format: `session:user:{userId}`, `search:user:{userId}`, etc.

#### Premium Users

- Same as authenticated but with higher limits
- Premium status checked via `subscriptionTier` and `subscriptionExpiry` fields

## Rate Limit Tiers

### Anonymous Users

- **Sessions**: 5 per hour
- **Searches**: 50 per hour
- **Applications**: 20 per day

### Authenticated Users (Free)

- **Sessions**: 10 per hour
- **Searches**: 100 per hour
- **Applications**: 50 per day

### Premium Users

- **Sessions**: 50 per hour
- **Searches**: 500 per hour
- **Applications**: 200 per day

## Implementation Details

### 1. Atomic Operations

The system uses DynamoDB conditional updates to handle concurrent requests:

```typescript
// First request creates entry
ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(dataType)";

// Subsequent requests increment atomically
UpdateExpression: "SET #count = #count + :inc";
ConditionExpression: "#count < :max";
```

### 2. Race Condition Handling

If two requests try to create the same rate limit entry:

- First request succeeds
- Second request gets `ConditionalCheckFailedException`
- System retries the operation

### 3. TTL Cleanup

Entries have a TTL set to 1 hour after the window expires:

```typescript
ttl: Math.floor(resetTime / 1000) + 3600;
```

This ensures old rate limit data is automatically cleaned up.

## API Integration

### Example: Wallcrawler Session Creation

```typescript
// In /api/wallcrawler/session
import { checkSessionRateLimit } from "@/lib/auth/rate-limiter";

export async function POST(request: NextRequest) {
  const rateLimitResult = await checkSessionRateLimit(request);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      },
      { status: 429 }
    );
  }

  // Continue with session creation...
}
```

### Response Headers

When rate limited, the API returns:

- Status: `429 Too Many Requests`
- Body includes: limit, remaining requests, and reset time

## Premium Subscription Check

The system validates premium status on each request:

```typescript
async function isPremiumUser(userId: string): Promise<boolean> {
  const profile = await dynamodbService.getUserProfile(userId);

  if (profile?.subscriptionTier === "premium" && profile.subscriptionExpiry) {
    const expiryDate = new Date(profile.subscriptionExpiry);
    return expiryDate > new Date(); // Must not be expired
  }

  return false;
}
```

## Error Handling

If rate limit checks fail (e.g., DynamoDB error):

- System logs the error
- Request is **allowed** to prevent blocking users
- This ensures availability over strict enforcement

## Testing Rate Limits

### 1. Test Anonymous Limits

```bash
# Make 6 session requests (limit is 5/hour)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/wallcrawler/session
done
# 6th request should return 429
```

### 2. Test Authenticated Limits

```bash
# Sign in first, then test with session cookie
# Make 11 session requests (limit is 10/hour)
```

### 3. Test Premium User

1. Update user in DynamoDB:
   - Set `subscriptionTier: "premium"`
   - Set `subscriptionExpiry: "2025-12-31T23:59:59Z"`
2. Test higher limits (50 sessions/hour)

## Monitoring

Watch for these patterns in logs:

- Frequent "Rate limit exceeded" errors
- "Rate limit check failed" errors (DynamoDB issues)
- Users hitting limits consistently (may need tier upgrade)

## Future Enhancements

1. **Redis Cache**: Add Redis layer for faster lookups
2. **Sliding Windows**: Implement sliding windows instead of fixed
3. **Burst Allowance**: Allow short bursts over limit
4. **IP-based Limits**: Additional layer for DDoS protection
5. **Custom Tiers**: Support more granular subscription tiers
