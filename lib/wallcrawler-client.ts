import { Wallcrawler } from "@wallcrawler/sdk";

/**
 * Creates a configured Wallcrawler SDK client
 */
export function createWallcrawlerClient() {
  const apiKey = process.env.WALLCRAWLER_API_KEY;
  const baseURL = process.env.WALLCRAWLER_API_URL;

  if (!apiKey || !baseURL) {
    throw new Error(
      `Missing required environment variables: ${!apiKey ? "WALLCRAWLER_API_KEY" : ""} ${!baseURL ? "WALLCRAWLER_API_URL" : ""}`
    );
  }

  return new Wallcrawler({
    apiKey,
    baseURL,
  });
}
