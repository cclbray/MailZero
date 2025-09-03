#!/bin/bash

# Railway Deployment Script for MailZero
set -e

echo "🚂 Deploying MailZero to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

# Check if project is linked
if ! railway status &> /dev/null; then
    echo "🔗 Linking to Railway project..."
    echo "Please select your Railway project:"
    railway link
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the application
echo "🔨 Building application..."
pnpm run railway:build

# Run database migrations
echo "🗄️  Running database migrations..."
railway run pnpm railway:migrate

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your application should be available at your Railway domain"

# Show service URL
echo "📋 Service information:"
railway status

