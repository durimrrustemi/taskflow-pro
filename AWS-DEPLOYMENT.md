# AWS ECS Fargate Deployment Guide 🚀

This guide covers deploying TaskFlow Pro to AWS using ECS Fargate with an Application Load Balancer (ALB), providing the best balance of control, scalability, and simplicity.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Internet      │    │   Route 53      │    │   CloudFront    │
│   Users         │◄──►│   DNS           │◄──►│   CDN (Optional)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Application   │
                    │   Load Balancer │
                    │   (ALB)         │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   ECS Fargate   │
                    │   Cluster       │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   RDS PostgreSQL│
                    │   ElastiCache   │
                    │   S3 Buckets    │
                    └─────────────────┘
```

## 🛠️ Infrastructure Components

### Core Services
- **ECS Fargate**: Serverless container platform
- **Application Load Balancer**: Traffic distribution and SSL termination
- **RDS PostgreSQL**: Managed database service
- **ElastiCache Redis**: In-memory caching
- **S3**: File storage and static assets

### Security & Networking
- **VPC**: Isolated network environment
- **Security Groups**: Network access control
- **IAM Roles**: Service permissions
- **Secrets Manager**: Secure credential storage

### Monitoring & Logging
- **CloudWatch**: Metrics, logs, and alarms
- **SNS**: Alert notifications
- **X-Ray**: Distributed tracing (optional)

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Node.js 16+** and npm
3. **Docker** installed and running
4. **AWS CDK** installed globally: `npm install -g aws-cdk`

### 1. Environment Setup

```bash
# Clone and navigate to project
cd taskflow-pro

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration
```

### 2. AWS Configuration

```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity

# Set environment variables
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### 3. Deploy Infrastructure

```bash
# Navigate to CDK directory
cd infrastructure/cdk

# Install CDK dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION

# Deploy development environment
cdk deploy TaskFlowProStack-dev

# Deploy production environment
cdk deploy TaskFlowProStack-prod
```

### 4. Deploy Application

```bash
# Return to project root
cd ../..

# Deploy to development
./scripts/deploy.sh dev

# Deploy to production
./scripts/deploy.sh prod
```

## 📋 Detailed Deployment Steps

### Infrastructure Deployment

The CDK stack creates the following resources:

#### Networking
- VPC with public, private, and isolated subnets
- Internet Gateway and NAT Gateways
- Route tables and security groups

#### Compute
- ECS Fargate cluster
- Application Load Balancer
- Auto Scaling configuration

#### Storage
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- S3 buckets for file uploads

#### Security
- IAM roles and policies
- Secrets Manager for credentials
- Security groups with least privilege

### Application Deployment

1. **Build Docker Image**
   ```bash
   docker build -t taskflow-pro .
   ```

2. **Push to ECR**
   ```bash
   aws ecr get-login-password --region $AWS_REGION | \
   docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
   
   docker tag taskflow-pro:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/taskflow-pro-dev:latest
   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/taskflow-pro-dev:latest
   ```

3. **Update ECS Service**
   ```bash
   aws ecs update-service \
     --cluster taskflow-pro-dev \
     --service taskflow-pro-dev \
     --force-new-deployment
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DB_HOST` | Database endpoint | `db.xxxxx.us-east-1.rds.amazonaws.com` |
| `REDIS_HOST` | Redis endpoint | `redis.xxxxx.cache.amazonaws.com` |
| `AWS_S3_BUCKET` | S3 bucket name | `taskflow-pro-uploads-prod-123456789` |
| `JWT_SECRET` | JWT signing key | `your-secret-key` |

### Secrets Management

Sensitive data is stored in AWS Secrets Manager:

```bash
# View secrets
aws secretsmanager list-secrets --region $AWS_REGION

# Get secret value
aws secretsmanager get-secret-value \
  --secret-id TaskFlowProStack-prod-DBCredentials \
  --region $AWS_REGION
```

## 📊 Monitoring & Observability

### CloudWatch Dashboard

Access the dashboard at:
```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=TaskFlowPro-prod
```

### Key Metrics

- **ECS**: CPU/Memory utilization, task count
- **ALB**: Request count, response time, error rate
- **RDS**: CPU, connections, freeable memory
- **ElastiCache**: CPU, current connections

### Alerts

Configured alerts for:
- High CPU/Memory utilization (>80%)
- High response times (>2s)
- High error rates (>10 errors/5min)
- Database connection issues

### Logs

- **Application Logs**: `/ecs/taskflow-pro-prod`
- **ALB Access Logs**: S3 bucket (optional)
- **Database Logs**: RDS logs to CloudWatch

## 🔄 CI/CD Pipeline

### GitHub Actions

The repository includes a complete CI/CD pipeline:

1. **Test**: Run unit and integration tests
2. **Build**: Build and push Docker images to ECR
3. **Deploy**: Update ECS services
4. **Monitor**: Health checks and notifications

### Manual Deployment

```bash
# Deploy with infrastructure updates
./scripts/deploy.sh prod --deploy-infrastructure

# Deploy with database migrations
./scripts/deploy.sh prod --run-migrations
```

## 🛡️ Security Best Practices

### Network Security
- Private subnets for application and database
- Security groups with minimal required access
- VPC endpoints for AWS services

### Application Security
- HTTPS only in production
- JWT token blacklisting
- Input validation and sanitization
- Rate limiting

### Data Security
- Encryption at rest and in transit
- Secrets Manager for credentials
- Database backups with encryption
- S3 bucket policies

## 📈 Scaling & Performance

### Auto Scaling

ECS services automatically scale based on:
- CPU utilization (>70%)
- Memory utilization (>80%)
- Custom CloudWatch metrics

### Performance Optimization

- **Caching**: Redis for session and API caching
- **CDN**: CloudFront for static assets (optional)
- **Database**: Connection pooling and read replicas
- **Monitoring**: Performance metrics and alerting

## 🔍 Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check ECS service events
   aws ecs describe-services \
     --cluster taskflow-pro-prod \
     --services taskflow-pro-prod
   ```

2. **Database connection issues**
   ```bash
   # Check security groups
   aws ec2 describe-security-groups \
     --group-ids sg-xxxxxxxxx
   ```

3. **High memory usage**
   ```bash
   # Check CloudWatch metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name MemoryUtilization \
     --dimensions Name=ServiceName,Value=taskflow-pro-prod
   ```

### Health Checks

```bash
# Application health
curl https://api.taskflowpro.com/health

# Load balancer health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:...
```

## 💰 Cost Optimization

### Resource Sizing
- Start with minimal resources and scale up
- Use Spot instances for non-critical workloads
- Implement auto-scaling to match demand

### Monitoring Costs
- CloudWatch billing alerts
- AWS Cost Explorer analysis
- Reserved instances for predictable workloads

### Estimated Monthly Costs (US East 1)

| Service | Dev | Production |
|---------|-----|------------|
| ECS Fargate | $15-30 | $100-200 |
| RDS PostgreSQL | $20-40 | $100-300 |
| ElastiCache Redis | $15-25 | $50-150 |
| Application Load Balancer | $20 | $20 |
| S3 Storage | $1-5 | $10-50 |
| **Total** | **$71-120** | **$280-720** |

## 🎯 Production Checklist

- [ ] SSL certificate configured
- [ ] Domain name and Route 53 setup
- [ ] Database backups enabled
- [ ] Monitoring and alerting configured
- [ ] Security groups reviewed
- [ ] Secrets rotated
- [ ] Performance testing completed
- [ ] Disaster recovery plan documented
- [ ] Cost monitoring enabled
- [ ] Team access configured

## 📚 Additional Resources

- [AWS ECS Fargate Documentation](https://docs.aws.amazon.com/ecs/latest/userguide/what-is-fargate.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Best Practices](https://aws.amazon.com/blogs/containers/amazon-ecs-best-practices/)
- [Application Load Balancer Guide](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

---

This deployment provides a production-ready, scalable infrastructure that balances control, simplicity, and cost-effectiveness for your TaskFlow Pro application! 🎉
