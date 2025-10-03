#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BackendStack } from "../lib/stacks/backend-stack";
import { MonitoringStack } from "../lib/stacks/monitoring-stack";
import { WebStack } from "../lib/stacks/web-stack";
import * as fs from "fs";
import * as path from "path";

const app = new cdk.App();

const environment = app.node.tryGetContext("environment") || "dev";
const configPath = path.join(__dirname, "..", "config", `${environment}.json`);

if (!fs.existsSync(configPath)) {
  throw new Error(`Configuration file not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

const tags = {
  Environment: environment,
  Project: "jobseek",
  ManagedBy: "cdk",
};

const backendStack = new BackendStack(app, `JobseekBackend-${environment}`, {
  env,
  environment,
  config,
  tags,
});

// Get environment variables from context (if provided by deploy-secrets.ts)
const envVars = {
  googleClientId: app.node.tryGetContext("googleClientId"),
  googleClientSecret: app.node.tryGetContext("googleClientSecret"),
  twitterClientId: app.node.tryGetContext("twitterClientId"),
  twitterClientSecret: app.node.tryGetContext("twitterClientSecret"),
  authSecret: app.node.tryGetContext("authSecret"),
  anonymousJwtSecret: app.node.tryGetContext("anonymousJwtSecret"),
  wallcrawlerApiUrl: app.node.tryGetContext("wallcrawlerApiUrl"),
  wallcrawlerProjectId: app.node.tryGetContext("wallcrawlerProjectId"),
  anthropicApiKey: app.node.tryGetContext("anthropicApiKey"),
  viteAppEnv: app.node.tryGetContext("viteAppEnv"),
  authRedirectAllowList: app.node.tryGetContext("authRedirectAllowList"),
};

const hasEnvVars = Object.values(envVars).some(
  (value) => typeof value === "string" && value.length > 0
);

const webStack = new WebStack(app, `JobseekWeb-${environment}`, {
  env,
  environment,
  config,
  tags,
  usersTable: backendStack.usersTable,
  resumeBucket: backendStack.resumeBucket,
  envVars: hasEnvVars ? envVars : undefined,
});

webStack.addDependency(backendStack);

if (environment === "prod" || config.enableDetailedMonitoring) {
  const monitoringStack = new MonitoringStack(
    app,
    `JobseekMonitoring-${environment}`,
    {
      env,
      environment,
      config,
      usersTable: backendStack.usersTable,
      lambdaFunctions: backendStack.lambdaFunctions,
      webDistribution: webStack.distribution,
      edgeLambda: webStack.edgeLambda,
      webBucket: webStack.assetsBucket,
      tags,
    }
  );

  monitoringStack.addDependency(backendStack);
  monitoringStack.addDependency(webStack);
}
