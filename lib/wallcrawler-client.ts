import { Wallcrawler } from '@wallcrawler/sdk'

/**
 * Creates a configured Wallcrawler SDK client
 */
export function createWallcrawlerClient() {
  const apiKey = process.env.WALLCRAWLER_API_KEY
  const awsApiKey = process.env.WALLCRAWLER_AWS_API_KEY
  const baseURL = process.env.WALLCRAWLER_API_URL

  if (!awsApiKey || !apiKey || !baseURL) {
    throw new Error(`Missing required environment variables: ${!awsApiKey ? 'WALLCRAWLER_AWS_API_KEY' : ''} ${!apiKey ? 'WALLCRAWLER_API_KEY' : ''}`)
  }

  return new Wallcrawler({
    apiKey,
    awsApiKey,
    baseURL,
  })
}