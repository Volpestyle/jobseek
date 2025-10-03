import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  config: any;
  usersTable: dynamodb.Table;
  lambdaFunctions: Record<string, lambda.Function>;
  webDistribution?: cloudfront.IDistribution;
  edgeLambda?: lambda.IFunction;
  webBucket?: s3.IBucket;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const alarmTopic = new sns.Topic(this, "AlarmTopic", {
      topicName: `jobseek-alarms-${props.environment}`,
      displayName: `Jobseek Alarms (${props.environment})`,
    });

    if (props.config.alarmEmail) {
      alarmTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.config.alarmEmail)
      );
    }

    const dashboard = new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `jobseek-${props.environment}`,
      defaultInterval: cdk.Duration.hours(3),
    });

    const dynamodbWidgets: cloudwatch.IWidget[] = [];

    // Metrics for the single users table
    const readThrottle = new cloudwatch.Metric({
      namespace: "AWS/DynamoDB",
      metricName: "ReadThrottleEvents",
      dimensionsMap: {
        TableName: props.usersTable.tableName,
      },
      statistic: "Sum",
      period: cdk.Duration.minutes(5),
    });

    const writeThrottle = new cloudwatch.Metric({
      namespace: "AWS/DynamoDB",
      metricName: "WriteThrottleEvents",
      dimensionsMap: {
        TableName: props.usersTable.tableName,
      },
      statistic: "Sum",
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, "UsersTableThrottleAlarm", {
      metric: new cloudwatch.MathExpression({
        expression: "m1 + m2",
        usingMetrics: {
          m1: readThrottle,
          m2: writeThrottle,
        },
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "DynamoDB users table is being throttled",
      actionsEnabled: props.environment === "prod",
    }).addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    dynamodbWidgets.push(
      new cloudwatch.GraphWidget({
        title: "Users Table Metrics",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedReadCapacityUnits",
            dimensionsMap: {
              TableName: props.usersTable.tableName,
            },
            statistic: "Sum",
          }),
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedWriteCapacityUnits",
            dimensionsMap: {
              TableName: props.usersTable.tableName,
            },
            statistic: "Sum",
          }),
        ],
        right: [readThrottle, writeThrottle],
        width: 12,
        height: 6,
      })
    );

    const lambdaWidgets: cloudwatch.IWidget[] = [];
    Object.entries(props.lambdaFunctions).forEach(([name, func]) => {
      const errors = new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Errors",
        dimensionsMap: {
          FunctionName: func.functionName,
        },
        statistic: "Sum",
      });

      const throttles = new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Throttles",
        dimensionsMap: {
          FunctionName: func.functionName,
        },
        statistic: "Sum",
      });

      new cloudwatch.Alarm(this, `${name}FunctionErrorAlarm`, {
        metric: errors,
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Lambda function ${name} has errors`,
        actionsEnabled: props.environment === "prod",
      }).addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

      lambdaWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${name} Function Metrics`,
          left: [
            new cloudwatch.Metric({
              namespace: "AWS/Lambda",
              metricName: "Invocations",
              dimensionsMap: {
                FunctionName: func.functionName,
              },
              statistic: "Sum",
            }),
            new cloudwatch.Metric({
              namespace: "AWS/Lambda",
              metricName: "Duration",
              dimensionsMap: {
                FunctionName: func.functionName,
              },
              statistic: "Average",
            }),
          ],
          right: [errors, throttles],
          width: 12,
          height: 6,
        })
      );
    });

    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# Jobseek Dashboard (${props.environment})`,
        width: 24,
        height: 1,
      })
    );

    dashboard.addWidgets(...dynamodbWidgets);
    dashboard.addWidgets(...lambdaWidgets);

    if (props.edgeLambda) {
      const edgeMetrics = new cloudwatch.GraphWidget({
        title: "Edge Lambda Metrics",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Invocations",
            dimensionsMap: {
              FunctionName: props.edgeLambda.functionName,
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Duration",
            dimensionsMap: {
              FunctionName: props.edgeLambda.functionName,
            },
            statistic: "Average",
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Errors",
            dimensionsMap: {
              FunctionName: props.edgeLambda.functionName,
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 24,
        height: 6,
      });

      dashboard.addWidgets(edgeMetrics);
    }

    if (props.webDistribution) {
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: "CloudFront Requests",
          left: [
            new cloudwatch.Metric({
              namespace: "AWS/CloudFront",
              metricName: "Requests",
              dimensionsMap: {
                DistributionId: props.webDistribution.distributionId,
                Region: "Global",
              },
              statistic: "Sum",
              period: cdk.Duration.minutes(5),
            }),
          ],
          width: 12,
          height: 6,
        }),
        new cloudwatch.GraphWidget({
          title: "CloudFront Error Rates",
          left: [
            new cloudwatch.Metric({
              namespace: "AWS/CloudFront",
              metricName: "4xxErrorRate",
              dimensionsMap: {
                DistributionId: props.webDistribution.distributionId,
                Region: "Global",
              },
              statistic: "Average",
              period: cdk.Duration.minutes(5),
            }),
            new cloudwatch.Metric({
              namespace: "AWS/CloudFront",
              metricName: "5xxErrorRate",
              dimensionsMap: {
                DistributionId: props.webDistribution.distributionId,
                Region: "Global",
              },
              statistic: "Average",
              period: cdk.Duration.minutes(5),
            }),
          ],
          width: 12,
          height: 6,
        })
      );

      new cloudwatch.Alarm(this, "CloudFront5xxAlarm", {
        metric: new cloudwatch.Metric({
          namespace: "AWS/CloudFront",
          metricName: "5xxErrorRate",
          dimensionsMap: {
            DistributionId: props.webDistribution.distributionId,
            Region: "Global",
          },
          statistic: "Average",
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: "CloudFront 5xx error rate is above 1%",
        actionsEnabled: props.environment === "prod",
      }).addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
    }

    if (props.webBucket) {
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: "SPA Bucket Size",
          left: [
            new cloudwatch.Metric({
              namespace: "AWS/S3",
              metricName: "BucketSizeBytes",
              dimensionsMap: {
                BucketName: props.webBucket.bucketName,
                StorageType: "StandardStorage",
              },
              statistic: "Average",
              period: cdk.Duration.days(1),
            }),
          ],
          width: 12,
          height: 6,
        })
      );
    }
  }
}
