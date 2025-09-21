#!/bin/bash

# TaskFlow Pro Deployment Script
# This script builds and deploys the application to AWS ECS Fargate

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="taskflow-pro-${ENVIRONMENT}"
IMAGE_TAG=${3:-latest}

echo "🚀 Starting deployment for environment: $ENVIRONMENT"
echo "📍 Region: $REGION"
echo "🏦 AWS Account: $AWS_ACCOUNT_ID"
echo "📦 ECR Repository: $ECR_REPOSITORY"
echo "🏷️  Image Tag: $IMAGE_TAG"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Build and push Docker image to ECR
build_and_push_image() {
    print_status "Building and pushing Docker image..."
    
    # Login to ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
    
    # Create ECR repository if it doesn't exist
    aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $REGION > /dev/null 2>&1 || {
        print_status "Creating ECR repository: $ECR_REPOSITORY"
        aws ecr create-repository --repository-name $ECR_REPOSITORY --region $REGION
    }
    
    # Build Docker image
    print_status "Building Docker image..."
    docker build -t taskflow-pro .
    
    # Tag image for ECR
    docker tag taskflow-pro:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG
    
    # Push image to ECR
    print_status "Pushing image to ECR..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG
    
    print_success "Image pushed successfully"
}

# Deploy infrastructure with CDK
deploy_infrastructure() {
    print_status "Deploying infrastructure with CDK..."
    
    cd infrastructure/cdk
    
    # Install dependencies
    npm install
    
    # Bootstrap CDK if needed
    cdk bootstrap aws://$AWS_ACCOUNT_ID/$REGION
    
    # Deploy the stack
    cdk deploy TaskFlowProStack-$ENVIRONMENT --require-approval never
    
    cd ../..
    
    print_success "Infrastructure deployed successfully"
}

# Update ECS service with new image
update_ecs_service() {
    print_status "Updating ECS service with new image..."
    
    # Get the ECS cluster and service names
    CLUSTER_NAME="taskflow-pro-${ENVIRONMENT}"
    SERVICE_NAME="taskflow-pro-${ENVIRONMENT}"
    
    # Update the service with new image
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --force-new-deployment \
        --region $REGION
    
    # Wait for deployment to complete
    print_status "Waiting for deployment to complete..."
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $REGION
    
    print_success "ECS service updated successfully"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Get the task definition
    TASK_DEFINITION=$(aws ecs describe-services \
        --cluster taskflow-pro-${ENVIRONMENT} \
        --services taskflow-pro-${ENVIRONMENT} \
        --region $REGION \
        --query 'services[0].taskDefinition' \
        --output text)
    
    # Run migration task
    aws ecs run-task \
        --cluster taskflow-pro-${ENVIRONMENT} \
        --task-definition $TASK_DEFINITION \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$(aws ecs describe-services --cluster taskflow-pro-${ENVIRONMENT} --services taskflow-pro-${ENVIRONMENT} --region $REGION --query 'services[0].networkConfiguration.awsvpcConfiguration.subnets[0]' --output text | xargs -I {} aws ec2 describe-subnets --subnet-ids {} --query 'Subnets[0].SubnetId' --output text)]},securityGroups=[$(aws ecs describe-services --cluster taskflow-pro-${ENVIRONMENT} --services taskflow-pro-${ENVIRONMENT} --region $REGION --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' --output text)],assignPublicIp=ENABLED" \
        --overrides '{
            "containerOverrides": [
                {
                    "name": "TaskFlowPro",
                    "command": ["npm", "run", "migrate"]
                }
            ]
        }' \
        --region $REGION
    
    print_success "Database migrations completed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Get ALB DNS name
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name TaskFlowProStack-${ENVIRONMENT} \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    # Wait for service to be healthy
    MAX_ATTEMPTS=30
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -f -s "http://$ALB_DNS/health" > /dev/null; then
            print_success "Health check passed"
            return 0
        fi
        
        print_status "Health check attempt $ATTEMPT/$MAX_ATTEMPTS failed, retrying in 10 seconds..."
        sleep 10
        ATTEMPT=$((ATTEMPT + 1))
    done
    
    print_error "Health check failed after $MAX_ATTEMPTS attempts"
    return 1
}

# Main deployment flow
main() {
    print_status "Starting TaskFlow Pro deployment..."
    
    # Check prerequisites
    check_prerequisites
    
    # Build and push image
    build_and_push_image
    
    # Deploy infrastructure (only if this is a new deployment)
    if [ "$4" = "--deploy-infrastructure" ]; then
        deploy_infrastructure
    fi
    
    # Update ECS service
    update_ecs_service
    
    # Run migrations
    if [ "$ENVIRONMENT" = "prod" ] || [ "$4" = "--run-migrations" ]; then
        run_migrations
    fi
    
    # Health check
    if health_check; then
        print_success "🎉 Deployment completed successfully!"
        print_status "Application URL: http://$(aws cloudformation describe-stacks --stack-name TaskFlowProStack-${ENVIRONMENT} --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text)"
    else
        print_error "❌ Deployment failed health check"
        exit 1
    fi
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <environment> [region] [image-tag] [options]"
    echo ""
    echo "Arguments:"
    echo "  environment    Deployment environment (dev, staging, prod)"
    echo "  region         AWS region (default: us-east-1)"
    echo "  image-tag      Docker image tag (default: latest)"
    echo ""
    echo "Options:"
    echo "  --deploy-infrastructure  Deploy infrastructure with CDK"
    echo "  --run-migrations        Run database migrations"
    echo ""
    echo "Examples:"
    echo "  $0 dev                           # Deploy to dev environment"
    echo "  $0 prod us-west-2 v1.2.3        # Deploy v1.2.3 to prod in us-west-2"
    echo "  $0 staging --deploy-infrastructure # Deploy infrastructure and app to staging"
    exit 1
fi

# Run main function
main "$@"
