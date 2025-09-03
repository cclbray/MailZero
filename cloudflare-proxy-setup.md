# Cloudflare Proxy Setup for Railway Deployment

## Overview
This approach lets you deploy to Railway while keeping your custom domain through Cloudflare without any code changes.

## Architecture
```
Custom Domain → Cloudflare → Railway App
(yourdomain.com)   (Proxy)    (Railway)
```

## Setup Steps

### 1. Deploy to Railway (as normal)
```bash
railway up
```
Your app will be available at: `https://your-app.railway.app`

### 2. Configure Cloudflare DNS
In your Cloudflare dashboard:

**A Record (Root domain):**
```
Type: A
Name: @
Content: [Railway IP - get from railway status]
Proxy: ✅ Enabled (orange cloud)
```

**CNAME Record (Subdomain):**
```
Type: CNAME  
Name: mail
Content: your-app.railway.app
Proxy: ✅ Enabled (orange cloud)
```

### 3. Cloudflare Page Rules (Optional)
Create page rules for better performance:

**Rule 1: Cache API responses**
```
URL: yourdomain.com/api/*
Settings: Cache Level = Standard
```

**Rule 2: Always use HTTPS**
```
URL: yourdomain.com/*
Settings: Always Use HTTPS = On
```

### 4. Environment Variables (Railway)
Keep your existing environment variables:
```bash
VITE_PUBLIC_APP_URL=https://yourdomain.com
VITE_PUBLIC_BACKEND_URL=https://yourdomain.com/api
COOKIE_DOMAIN=yourdomain.com
```

## Benefits
- ✅ Zero code changes required
- ✅ Keep existing domain setup
- ✅ Cloudflare CDN and security features
- ✅ SSL termination at Cloudflare
- ✅ DDoS protection
- ✅ Analytics and monitoring

## Considerations
- Additional Cloudflare costs (if using paid features)
- Slight latency increase due to proxy
- Need to manage two platforms (Cloudflare + Railway)

## Testing
1. Deploy to Railway
2. Configure Cloudflare proxy
3. Test at your custom domain
4. Verify all features work correctly

