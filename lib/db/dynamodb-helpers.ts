import {
  UpdateCommand,
  BatchWriteCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Generates current timestamp and optionally createdAt timestamp
 */
export function createTimestamps(includeCreatedAt = false): {
  updatedAt: string;
  createdAt?: string;
} {
  const now = new Date().toISOString();
  return includeCreatedAt
    ? { createdAt: now, updatedAt: now }
    : { updatedAt: now };
}

/**
 * Builds DynamoDB UpdateExpression from an object
 * Automatically handles reserved keywords and generates attribute names/values
 */
export function buildUpdateExpression(
  updates: Record<string, any>,
  excludeKeys: string[] = []
): {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, any>;
} {
  const updateParts: string[] = [];
  const removeKeys: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (excludeKeys.includes(key)) return;

    if (value === undefined || value === null) {
      removeKeys.push(`#${key}`);
      expressionAttributeNames[`#${key}`] = key;
    } else {
      updateParts.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  let updateExpression = "";
  if (updateParts.length > 0) {
    updateExpression = `SET ${updateParts.join(", ")}`;
  }
  if (removeKeys.length > 0) {
    updateExpression += updateExpression ? " " : "";
    updateExpression += `REMOVE ${removeKeys.join(", ")}`;
  }

  return {
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };
}

/**
 * Performs atomic update on DynamoDB item
 * Prevents fetch-merge-save race conditions
 */
export async function atomicUpdate<T>(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  key: Record<string, any>,
  updates: Partial<T>,
  options?: {
    conditionExpression?: string;
    returnValues?:
      | "ALL_NEW"
      | "ALL_OLD"
      | "UPDATED_NEW"
      | "UPDATED_OLD"
      | "NONE";
  }
): Promise<T> {
  const timestamps = createTimestamps();
  const allUpdates = { ...updates, ...timestamps };

  const {
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  } = buildUpdateExpression(allUpdates, Object.keys(key));

  const command = new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: options?.returnValues || "ALL_NEW",
    ...(options?.conditionExpression && {
      ConditionExpression: options.conditionExpression,
    }),
  });

  const response = await docClient.send(command);
  return response.Attributes as T;
}

/**
 * Retry wrapper with exponential backoff for DynamoDB operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry validation errors
      if (error.name === "ValidationException") {
        throw error;
      }

      // Check if retryable error
      const retryableErrors = [
        "ProvisionedThroughputExceededException",
        "ThrottlingException",
        "RequestLimitExceeded",
        "ServiceUnavailable",
        "InternalServerError",
      ];

      if (!retryableErrors.includes(error.name) || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Batch write items with automatic chunking (DynamoDB limit is 25 items per batch)
 */
export async function batchWriteItems(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  items: Array<{ PutRequest?: { Item: any }; DeleteRequest?: { Key: any } }>,
  chunkSize = 25
): Promise<void> {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const operations = chunks.map((chunk) =>
    withRetry(async () => {
      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk,
        },
      });

      const response = await docClient.send(command);

      // Handle unprocessed items
      const unprocessedItems = response.UnprocessedItems?.[tableName];
      if (unprocessedItems && unprocessedItems.length > 0) {
        // Retry unprocessed items
        await batchWriteItems(docClient, tableName, unprocessedItems);
      }
    })
  );

  await Promise.all(operations);
}

/**
 * Batch get items with automatic chunking (DynamoDB limit is 100 items per batch)
 */
export async function batchGetItems(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  keys: Array<Record<string, any>>,
  chunkSize = 100
): Promise<any[]> {
  const chunks = [];
  for (let i = 0; i < keys.length; i += chunkSize) {
    chunks.push(keys.slice(i, i + chunkSize));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      withRetry(async () => {
        const command = new BatchGetCommand({
          RequestItems: {
            [tableName]: {
              Keys: chunk,
            },
          },
        });

        const response = await docClient.send(command);

        // Handle unprocessed keys
        const unprocessedData = response.UnprocessedKeys?.[tableName];
        if (unprocessedData?.Keys && unprocessedData.Keys.length > 0) {
          // Retry unprocessed keys
          const unprocessedItems = await batchGetItems(
            docClient,
            tableName,
            unprocessedData.Keys
          );
          return [
            ...(response.Responses?.[tableName] || []),
            ...unprocessedItems,
          ];
        }

        return response.Responses?.[tableName] || [];
      })
    )
  );

  return results.flat();
}

/**
 * Type guard for DynamoDB items
 */
export function isValidItem<T>(
  item: any,
  requiredFields: (keyof T)[]
): item is T {
  if (!item || typeof item !== "object") return false;
  return requiredFields.every((field) => field in item);
}
