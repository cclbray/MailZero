#!/bin/bash

# Deploy MailZero to Railway with custom domain setup
set -e

echo "🚂 Deploying MailZero to Railway with custom domain..."

# Get domain from user
read -p "Enter your custom domain (e.g., mail.yourdomain.com): " CUSTOM_DOMAIN

if [ -z "$CUSTOM_DOMAIN" ]; then
    echo "❌ Domain is required"
    exit 1
fi

# Extract base domain for cookie settings
BASE_DOMAIN=$(echo $CUSTOM_DOMAIN | sed 's/^[^.]*\.//')

echo "🔧 Configuring for domain: $CUSTOM_DOMAIN"
echo "🍪 Cookie domain: $BASE_DOMAIN"

# Set environment variables for custom domain
railway variables set VITE_PUBLIC_APP_URL=https://$CUSTOM_DOMAIN
railway variables set VITE_PUBLIC_BACKEND_URL=https://$CUSTOM_DOMAIN/api
railway variables set NEXT_PUBLIC_APP_URL=https://$CUSTOM_DOMAIN
railway variables set NEXT_PUBLIC_BACKEND_URL=https://$CUSTOM_DOMAIN/api
railway variables set COOKIE_DOMAIN=$BASE_DOMAIN

echo "✅ Environment variables set for custom domain"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

# Get Railway URL for DNS configuration
RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null || echo "Check Railway dashboard")

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS for your domain:"
echo "   Type: CNAME"
echo "   Name: $(echo $CUSTOM_DOMAIN | cut -d'.' -f1)"
echo "   Value: $(echo $RAILWAY_URL | sed 's/https:\/\///')"
echo ""
echo "2. Add custom domain in Railway dashboard:"
echo "   - Go to Settings → Domains"
echo "   - Add custom domain: $CUSTOM_DOMAIN"
echo ""
echo "3. Wait for DNS propagation (5-30 minutes)"
echo "4. Test your app at: https://$CUSTOM_DOMAIN"

