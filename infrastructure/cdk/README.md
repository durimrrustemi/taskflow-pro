# TaskFlow Pro Infrastructure

This directory contains the AWS CDK infrastructure code for deploying TaskFlow Pro to AWS ECS Fargate.

## 🏗️ Architecture

The infrastructure creates a complete, production-ready environment with:

- **ECS Fargate** for containerized application hosting
- **Application Load Balancer** for traffic distribution
- **RDS PostgreSQL** for primary database
- **ElastiCache Redis** for caching and sessions
- **S3** for file storage
- **CloudWatch** for monitoring and logging
- **Route 53** for DNS management (optional)

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** configured
2. **Node.js 16+**
3. **AWS CDK** installed: `npm install -g aws-cdk`

### Deployment

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy development environment
cdk deploy TaskFlowProStack-dev

# Deploy production environment
cdk deploy TaskFlowProStack-prod
```

## 📁 Structure

```
infrastructure/cdk/
├── bin/
│   └── app.ts                 # CDK app entry point
├── lib/
│   ├── taskflow-pro-stack.ts  # Main infrastructure stack
│   └── monitoring-stack.ts    # Monitoring and alerting
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
└── cdk.json                   # CDK configuration
```

## 🔧 Configuration

### Environment Variables

Set these environment variables before deployment:

```bash
export AWS_REGION=us-east-1
export DEV_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxxxx
export PROD_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxxxx
```

### Customization

Edit `lib/taskflow-pro-stack.ts` to customize:

- Instance sizes
- Auto-scaling parameters
- Security group rules
- Environment variables

## 📊 Monitoring

The monitoring stack includes:

- **CloudWatch Dashboard** with key metrics
- **Alarms** for critical thresholds
- **SNS notifications** for alerts
- **Custom metrics** for application monitoring

## 🔒 Security

Security features:

- **VPC** with public/private subnets
- **Security Groups** with least privilege
- **Secrets Manager** for sensitive data
- **IAM roles** with minimal permissions
- **Encryption** at rest and in transit

## 💰 Cost Optimization

- **Auto Scaling** based on demand
- **Spot instances** for non-critical workloads
- **Reserved capacity** for predictable usage
- **Resource tagging** for cost tracking

## 🛠️ Commands

```bash
# Deploy specific environment
cdk deploy TaskFlowProStack-dev

# Deploy all environments
cdk deploy --all

# View differences
cdk diff

# Synthesize CloudFormation
cdk synth

# Destroy stack
cdk destroy TaskFlowProStack-dev

# List all stacks
cdk list
```

## 📋 Outputs

After deployment, the stack outputs:

- Load Balancer DNS name
- Database endpoint
- Redis endpoint
- S3 bucket name
- ECS cluster name
- ECS service name

## 🔍 Troubleshooting

### Common Issues

1. **Bootstrap required**
   ```bash
   cdk bootstrap aws://ACCOUNT_ID/REGION
   ```

2. **Permissions error**
   - Ensure AWS credentials have sufficient permissions
   - Check IAM policies for CDK operations

3. **Resource limits**
   - Check AWS service limits
   - Request limit increases if needed

### Debugging

```bash
# Enable verbose logging
cdk deploy --verbose

# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name TaskFlowProStack-dev
```

## 📚 Documentation

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Fargate Guide](https://docs.aws.amazon.com/ecs/latest/userguide/what-is-fargate.html)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

---

For application deployment, see the main [AWS-DEPLOYMENT.md](../AWS-DEPLOYMENT.md) guide.
