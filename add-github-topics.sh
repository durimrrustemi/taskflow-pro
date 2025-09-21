#!/bin/bash

# Script to add topics to GitHub repository
# Make sure you have GitHub CLI installed and authenticated

echo "Adding topics to GitHub repository..."

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first:"
    echo "brew install gh"
    echo "or visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "Please authenticate with GitHub CLI first:"
    echo "gh auth login"
    exit 1
fi

# Add topics to the repository
echo "Adding topics: nodejs, express, swagger, docker, postgresql, redis, jwt, api, restful"

gh api repos/durimrrustemi/taskflow-pro/topics \
  --method PUT \
  -H "Accept: application/vnd.github.mercy-preview+json" \
  -f names='["nodejs","express","swagger","docker","postgresql","redis","jwt","api","restful","task-management","backend","microservices","authentication","documentation","openapi"]'

if [ $? -eq 0 ]; then
    echo "✅ Topics added successfully!"
    echo "Visit: https://github.com/durimrrustemi/taskflow-pro"
else
    echo "❌ Failed to add topics. Please try manually:"
    echo "1. Go to https://github.com/durimrrustemi/taskflow-pro"
    echo "2. Click on the gear icon next to 'About'"
    echo "3. Add these topics: nodejs, express, swagger, docker, postgresql, redis, jwt, api, restful"
fi
