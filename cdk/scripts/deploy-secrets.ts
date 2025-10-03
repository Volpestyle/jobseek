#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { z } from "zod";
import {
  SecretsManagerClient,
  CreateSecretCommand,
  UpdateSecretCommand,
  DescribeSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const deployConfigSchema = z
  .object({
    // Secrets Manager secrets
    GITHUB_TOKEN: z.string().optional(),
    WALLCRAWLER_API_KEY: z.string().optional(),

    // Application environment variables
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
    TWITTER_CLIENT_ID: z.string().optional(),
    TWITTER_CLIENT_SECRET: z.string().optional(),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    ANONYMOUS_JWT_SECRET: z.string().min(1, "ANONYMOUS_JWT_SECRET is required"),
    WALLCRAWLER_API_URL: z.string().optional(),
    WALLCRAWLER_PROJECT_ID: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    VITE_APP_ENV: z.string().optional(),
    AUTH_REDIRECT_ALLOWLIST: z.string().optional(),

    // AWS Configuration
    AWS_REGION: z.string().optional(),
    AWS_PROFILE: z.string().optional(),

    // DynamoDB and S3 (from backend stack outputs)
    DYNAMODB_USERS_TABLE: z.string().optional(),
    S3_RESUME_BUCKET: z.string().optional(),
  })
  .passthrough();

type DeployConfig = z.infer<typeof deployConfigSchema>;

async function createOrUpdateSecret(
  client: SecretsManagerClient,
  secretName: string,
  secretValue: string
) {
  try {
    // Check if secret exists
    await client.send(new DescribeSecretCommand({ SecretId: secretName }));

    // Update existing secret
    await client.send(
      new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretValue,
      })
    );
    console.log(`✅ Updated secret: ${secretName}`);
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      // Create new secret
      await client.send(
        new CreateSecretCommand({
          Name: secretName,
          SecretString: secretValue,
        })
      );
      console.log(`✅ Created secret: ${secretName}`);
    } else {
      throw error;
    }
  }
}

async function main() {
  const environment = process.argv[2] || "dev";
  // Map environment names to .env file names
  const envFileMap: Record<string, string> = {
    dev: ".env.local",
    development: ".env.local",
    local: ".env.local",
    staging: ".env.staging",
    prod: ".env.prod",
    production: ".env.prod",
  };
  const envFile =
    process.argv[3] || envFileMap[environment] || `.env.${environment}`;

  console.log(`🚀 Deploying secrets for environment: ${environment}`);
  console.log(`📄 Reading from: ${envFile}`);

  // Load environment file - check both current dir and parent dir
  let envPath = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(envPath)) {
    // Try parent directory (for when running from cdk folder)
    envPath = path.resolve(process.cwd(), "..", envFile);
    if (!fs.existsSync(envPath)) {
      console.error(`❌ Environment file not found: ${envFile}`);
      console.error(`  Checked: ${path.resolve(process.cwd(), envFile)}`);
      console.error(`  Checked: ${path.resolve(process.cwd(), "..", envFile)}`);
      console.log("\nFetch the environment file from Secrets Manager:");
      console.log(
        `aws secretsmanager get-secret-value --secret-id jobseek/env-file-${environment} --query SecretString --output text > ${envFile}`
      );
      console.log("\nOr create a file based on .env.example:");
      console.log(`cp .env.example ${envFile}`);
      process.exit(1);
    }
  }

  const envFileContents = fs.readFileSync(envPath, "utf8");
  const envConfig = dotenv.parse(envFileContents);
  const parsedConfig = deployConfigSchema.safeParse(envConfig);

  if (!parsedConfig.success) {
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsedConfig.error.errors) {
      const pathLabel = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      console.error(`  - ${pathLabel}: ${issue.message}`);
    }
    process.exit(1);
  }

  const config: DeployConfig = parsedConfig.data;

  // Configure AWS client
  const region = config.AWS_REGION || process.env.AWS_REGION || "us-east-1";
  const clientConfig: any = { region };

  if (config.AWS_PROFILE) {
    process.env.AWS_PROFILE = config.AWS_PROFILE;
    console.log(`🔑 Using AWS profile: ${config.AWS_PROFILE}`);
  }

  const client = new SecretsManagerClient(clientConfig);

  try {
    // Deploy to Secrets Manager
    console.log("\n📦 Deploying to AWS Secrets Manager...");

    const envFileSecretName = `jobseek/env-file-${environment}`;
    await createOrUpdateSecret(
      client,
      envFileSecretName,
      envFileContents
    );
    console.log(`✅ Stored environment file: ${envFileSecretName}`);

    // GitHub token (if provided)
    if (config.GITHUB_TOKEN) {
      await createOrUpdateSecret(
        client,
        `jobseek/github-token`,
        JSON.stringify({ token: config.GITHUB_TOKEN })
      );
    }

    // Wallcrawler API key (if provided)
    if (config.WALLCRAWLER_API_KEY) {
      await createOrUpdateSecret(
        client,
        `jobseek/wallcrawler-api-key`,
        JSON.stringify({ apiKey: config.WALLCRAWLER_API_KEY })
      );
    }

    // Generate CDK context for web stack environment variables
    const appEnvVars = {
      googleClientId: config.GOOGLE_CLIENT_ID,
      googleClientSecret: config.GOOGLE_CLIENT_SECRET,
      twitterClientId: config.TWITTER_CLIENT_ID || "",
      twitterClientSecret: config.TWITTER_CLIENT_SECRET || "",
      authSecret: config.AUTH_SECRET,
      anonymousJwtSecret: config.ANONYMOUS_JWT_SECRET,
      wallcrawlerApiUrl: config.WALLCRAWLER_API_URL || "",
      wallcrawlerProjectId: config.WALLCRAWLER_PROJECT_ID || "",
      anthropicApiKey: config.ANTHROPIC_API_KEY || "",
      viteAppEnv: config.VITE_APP_ENV || environment,
      authRedirectAllowList: config.AUTH_REDIRECT_ALLOWLIST || "",
    };

    console.log("\n📝 CDK deployment command:");
    console.log(`cdk deploy --all \\
      --context environment=${environment} \\
      --context googleClientId="${appEnvVars.googleClientId}" \\
      --context googleClientSecret="${appEnvVars.googleClientSecret}" \\
      --context twitterClientId="${appEnvVars.twitterClientId}" \\
      --context twitterClientSecret="${appEnvVars.twitterClientSecret}" \\
      --context authSecret="${appEnvVars.authSecret}" \\
      --context anonymousJwtSecret="${appEnvVars.anonymousJwtSecret}" \\
      --context wallcrawlerApiUrl="${appEnvVars.wallcrawlerApiUrl}" \\
      --context wallcrawlerProjectId="${appEnvVars.wallcrawlerProjectId}" \\
      --context anthropicApiKey="${appEnvVars.anthropicApiKey}" \\
      --context viteAppEnv="${appEnvVars.viteAppEnv}" \\
      --context authRedirectAllowList="${appEnvVars.authRedirectAllowList}"`);

    // Save context to file for easier deployment
    const contextFile = `cdk.context.${environment}.json`;
    fs.writeFileSync(
      contextFile,
      JSON.stringify(
        {
          environment,
          ...appEnvVars,
        },
        null,
        2
      )
    );

    console.log(`\n✅ Context saved to: ${contextFile}`);
    console.log("\nAlternative deployment command:");
    console.log(`cdk deploy --all --context-file ${contextFile}`);

    console.log("\n✅ Secrets deployment complete!");
  } catch (error) {
    console.error("❌ Error deploying secrets:", error);
    process.exit(1);
  }
}

main().catch(console.error);
