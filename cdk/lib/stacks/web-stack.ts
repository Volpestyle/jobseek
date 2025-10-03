import * as fs from "fs";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export interface WebStackEnvVars {
  googleClientId?: string;
  googleClientSecret?: string;
  twitterClientId?: string;
  twitterClientSecret?: string;
  authSecret?: string;
  anonymousJwtSecret?: string;
  wallcrawlerApiUrl?: string;
  wallcrawlerProjectId?: string;
  anthropicApiKey?: string;
  viteAppEnv?: string;
  authRedirectAllowList?: string;
}

export interface WebStackProps extends cdk.StackProps {
  environment: string;
  config: any;
  usersTable: dynamodb.ITable;
  resumeBucket: s3.IBucket;
  envVars?: WebStackEnvVars;
}

export class WebStack extends cdk.Stack {
  public readonly assetsBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly edgeLambda: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const projectRoot = path.resolve(__dirname, "..", "..", "..");
    const clientDistPath = path.join(projectRoot, "dist");

    if (!fs.existsSync(clientDistPath)) {
      throw new Error(
        `Client build not found at ${clientDistPath}. Run \`pnpm client:build\` before deploying.`
      );
    }

    const accountId = cdk.Stack.of(this).account;
    const bucketName = `jobseek-web-${props.environment}-${accountId}`;

    this.assetsBucket = new s3.Bucket(this, "WebAssetsBucket", {
      bucketName,
      versioned: props.environment === "prod",
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== "prod",
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "WebOAI"
    );
    this.assetsBucket.grantRead(originAccessIdentity);

    const wallcrawlerSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "WallcrawlerApiKey",
      props.config.wallcrawlerApiKeySecretName
    );

    const lambdaEnv: Record<string, string> = {
      NODE_ENV: props.environment === "prod" ? "production" : "development",
      DYNAMODB_USERS_TABLE: props.usersTable.tableName,
      S3_RESUME_BUCKET: props.resumeBucket.bucketName,
    };

    const optionalEnv: Record<string, string | undefined> = {
      GOOGLE_CLIENT_ID: props.envVars?.googleClientId,
      GOOGLE_CLIENT_SECRET: props.envVars?.googleClientSecret,
      TWITTER_CLIENT_ID: props.envVars?.twitterClientId,
      TWITTER_CLIENT_SECRET: props.envVars?.twitterClientSecret,
      AUTH_SECRET: props.envVars?.authSecret,
      ANONYMOUS_JWT_SECRET: props.envVars?.anonymousJwtSecret,
      WALLCRAWLER_API_URL: props.envVars?.wallcrawlerApiUrl,
      WALLCRAWLER_PROJECT_ID: props.envVars?.wallcrawlerProjectId,
      ANTHROPIC_API_KEY: props.envVars?.anthropicApiKey,
      VITE_APP_ENV: props.envVars?.viteAppEnv ?? props.environment ?? "dev",
      AUTH_REDIRECT_ALLOWLIST: props.envVars?.authRedirectAllowList,
    };

    Object.entries(optionalEnv).forEach(([key, value]) => {
      if (value && value.length > 0) {
        lambdaEnv[key] = value;
      }
    });

    lambdaEnv["WALLCRAWLER_API_KEY"] = wallcrawlerSecret
      .secretValueFromJson("apiKey")
      .unsafeUnwrap();

    this.edgeLambda = new lambdaNodejs.NodejsFunction(this, "HonoEdge", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.resolve(projectRoot, "server", "edge-handler.ts"),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        target: "node18",
        format: lambdaNodejs.OutputFormat.CJS,
        minify: true,
        sourceMap: false,
        externalModules: ["dotenv"],
        nodeModules: ["dotenv"],
      },
      environment: lambdaEnv,
      description: `Jobseek Hono API (${props.environment})`,
    });

    props.usersTable.grantReadWriteData(this.edgeLambda);
    props.resumeBucket.grantReadWrite(this.edgeLambda);
    wallcrawlerSecret.grantRead(this.edgeLambda);

    // Allow the Lambda to manage cookies/headers for edge traffic
    this.edgeLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    const functionUrl = this.edgeLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const functionUrlDomain = cdk.Fn.select(
      2,
      cdk.Fn.split("/", functionUrl.url)
    );

    const apiOrigin = new origins.HttpOrigin(functionUrlDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    const cachePolicy = new cloudfront.CachePolicy(this, "SpaCachePolicy", {
      cachePolicyName: `jobseek-spa-${props.environment}`,
      defaultTtl: cdk.Duration.hours(1),
      minTtl: cdk.Duration.minutes(1),
      maxTtl: cdk.Duration.days(1),
      cookieBehavior: cloudfront.CacheCookieBehavior.allowList(
        "authjs.session-token",
        "next-auth.session-token"
      ),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        "Authorization",
        "Accept",
        "Accept-Encoding"
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    });

    const spaOrigin = new origins.S3Origin(this.assetsBucket, {
      originAccessIdentity,
    });

    this.distribution = new cloudfront.Distribution(this, "WebDistribution", {
      defaultBehavior: {
        origin: spaOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      defaultRootObject: "index.html",
      enableLogging: props.environment === "prod",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(1),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(1),
        },
      ],
    });

    functionUrl.grantInvokeUrl(
      new iam.ServicePrincipal("cloudfront.amazonaws.com")
    );

    new s3deploy.BucketDeployment(this, "DeployClient", {
      sources: [s3deploy.Source.asset(clientDistPath)],
      destinationBucket: this.assetsBucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
      prune: true,
    });

    new cdk.CfnOutput(this, "WebBucketName", {
      value: this.assetsBucket.bucketName,
      exportName: `jobseek-web-bucket-${props.environment}`,
    });

    new cdk.CfnOutput(this, "CloudFrontDomain", {
      value: this.distribution.domainName,
      exportName: `jobseek-web-domain-${props.environment}`,
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: this.distribution.distributionId,
      exportName: `jobseek-web-distribution-${props.environment}`,
    });

    new cdk.CfnOutput(this, "EdgeLambdaArn", {
      value: this.edgeLambda.functionArn,
      exportName: `jobseek-edge-lambda-${props.environment}`,
    });
  }
}
