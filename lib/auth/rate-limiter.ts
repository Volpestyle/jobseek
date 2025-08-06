import { NextRequest } from "next/server"
import { getUserFromRequest } from "./auth-utils"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const docClient = DynamoDBDocumentClient.from(client)
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "jobseek-users-dev"

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
}

// Premium tier configuration
export const RATE_LIMIT_TIERS = {
  anonymous: {
    session: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 sessions/hour
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
} as const

// Check if user has premium subscription
async function isPremiumUser(userId: string | null): Promise<boolean> {
  if (!userId) return false

  try {
    const { dynamodbService } = await import("@/lib/db/dynamodb.service")
    const profile = await dynamodbService.getUserProfile(userId)

    // Check if user has active premium subscription
    if (profile?.subscriptionTier === 'premium' && profile.subscriptionExpiry) {
      const expiryDate = new Date(profile.subscriptionExpiry)
      return expiryDate > new Date()
    }

    return false
  } catch (error) {
    console.error('Error checking premium status:', error)
    return false
  }
}

// Single table rate limit check
async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs
  const resetTime = windowStart + config.windowMs

  // Use identifier as userId and construct dataType for rate limit
  const userId = identifier
  const dataType = `RATE_LIMIT#${windowStart}`

  try {
    // Try to get existing rate limit entry
    const getCommand = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType,
      },
    })

    const { Item } = await docClient.send(getCommand)

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
        ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(dataType)",
      })

      try {
        await docClient.send(putCommand)
        return {
          allowed: true,
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          resetTime,
        }
      } catch (error: any) {
        if (error.name === "ConditionalCheckFailedException") {
          // Another request created it first, retry
          return checkRateLimit(identifier, config)
        }
        throw error
      }
    }

    // Check if limit exceeded
    if (Item.count >= config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: Item.resetTime,
      }
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
    })

    try {
      const { Attributes } = await docClient.send(updateCommand)

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - (Attributes?.count || 0),
        resetTime: Attributes?.resetTime || resetTime,
      }
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        // Limit exceeded
        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: Item.resetTime,
        }
      }
      throw error
    }
  } catch (error) {
    console.error("Rate limit check failed:", error)
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime,
    }
  }
}

// Get rate limit config based on user tier
async function getRateLimitConfig(
  request: NextRequest,
  limitType: 'session' | 'search' | 'apply'
): Promise<{ identifier: string; config: RateLimitConfig }> {
  const userInfo = await getUserFromRequest(request)

  if (!userInfo) {
    // No user identified, use IP-based fallback
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    return {
      identifier: `${limitType}:ip:${ip}`,
      config: RATE_LIMIT_TIERS.anonymous[limitType],
    }
  }

  if (userInfo.isAuthenticated && userInfo.userId) {
    // Authenticated user
    const isPremium = await isPremiumUser(userInfo.userId)
    const tier = isPremium ? 'premium' : 'authenticated'

    return {
      identifier: `${limitType}:user:${userInfo.userId}`,
      config: RATE_LIMIT_TIERS[tier][limitType],
    }
  } else {
    // Anonymous user with token
    return {
      identifier: `${limitType}:${userInfo.userId}`,
      config: RATE_LIMIT_TIERS.anonymous[limitType],
    }
  }
}

// Rate limiter for session creation
export async function checkSessionRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const { identifier, config } = await getRateLimitConfig(request, 'session')
  return checkRateLimit(identifier, config)
}

// Rate limiter for search operations
export async function checkSearchRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const { identifier, config } = await getRateLimitConfig(request, 'search')
  return checkRateLimit(identifier, config)
}

// Rate limiter for job applications
export async function checkApplyRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const { identifier, config } = await getRateLimitConfig(request, 'apply')
  return checkRateLimit(identifier, config)
}

// Legacy functions for backward compatibility
export function checkAnonymousSessionRateLimit(request: NextRequest): Promise<RateLimitResult> {
  return checkSessionRateLimit(request)
}

export function checkAnonymousSearchRateLimit(request: NextRequest): Promise<RateLimitResult> {
  return checkSearchRateLimit(request)
}

export function checkAnonymousApplyRateLimit(request: NextRequest): Promise<RateLimitResult> {
  return checkApplyRateLimit(request)
}