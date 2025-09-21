#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TaskFlowProStack } from '../lib/taskflow-pro-stack';

const app = new cdk.App();

// Development environment
new TaskFlowProStack(app, 'TaskFlowProStack-dev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment: 'dev',
  domainName: 'dev-api.taskflowpro.com',
  certificateArn: process.env.DEV_CERTIFICATE_ARN,
  description: 'TaskFlow Pro Development Environment',
});

// Production environment
new TaskFlowProStack(app, 'TaskFlowProStack-prod', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment: 'prod',
  domainName: 'api.taskflowpro.com',
  certificateArn: process.env.PROD_CERTIFICATE_ARN,
  description: 'TaskFlow Pro Production Environment',
});

// Staging environment (optional)
if (process.env.ENABLE_STAGING === 'true') {
  new TaskFlowProStack(app, 'TaskFlowProStack-staging', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    environment: 'staging',
    domainName: 'staging-api.taskflowpro.com',
    certificateArn: process.env.STAGING_CERTIFICATE_ARN,
    description: 'TaskFlow Pro Staging Environment',
  });
}
