# OAuth Setup Guide for JobSeek

## Overview

JobSeek uses NextAuth.js for OAuth authentication with Google and Twitter providers. User sessions are managed using secure httpOnly cookies containing JWT tokens, ensuring maximum security against XSS attacks.

## Google OAuth Setup

### Development Environment
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth client ID
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`

### Production Environment
Add these redirect URIs to the same OAuth client or create a separate one:
- `https://jobseek.ninja.com/api/auth/callback/google`

## Twitter/X OAuth Setup

### Development Environment
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or select existing
3. Go to "User authentication settings"
4. Enable OAuth 2.0
5. Add callback URLs:
   - `http://localhost:3000/api/auth/callback/twitter`

### Production Environment
Add these callback URLs:
- `https://jobseek.ninja.com/api/auth/callback/twitter`

## Environment Variables

### Development (.env.local)
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Twitter OAuth
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret # Generate with: openssl rand -base64 32

# JWT Secrets (for custom auth tokens)
AUTH_JWT_SECRET=your-auth-jwt-secret # Generate with: openssl rand -base64 32
ANONYMOUS_JWT_SECRET=your-anon-jwt-secret # Generate with: openssl rand -base64 32
```

### Production
```env
# NextAuth - Update for production
NEXTAUTH_URL=https://jobseek.ninja.com
NEXTAUTH_SECRET=different-secret-for-production # Generate new one!

# JWT Secrets - Use different ones for production!
AUTH_JWT_SECRET=production-auth-jwt-secret
ANONYMOUS_JWT_SECRET=production-anon-jwt-secret

# Same OAuth credentials work for both environments if you add both callback URLs
```

## Security Best Practices

1. **Never commit real credentials** - Use environment variables
2. **Use different NextAuth secrets** for dev and production
3. **Store production secrets** in AWS Secrets Manager or Parameter Store
4. **Rotate secrets regularly**
5. **Monitor OAuth usage** in provider dashboards

## Testing OAuth Flow

1. Start dev server: `pnpm dev`
2. Navigate to `/auth/signin`
3. Click Google or Twitter sign-in
4. Verify redirect to provider
5. Authorize and verify callback to `/dashboard`
6. Check DynamoDB for user profile creation

## Common Issues

### "Redirect URI mismatch"
- Ensure callback URLs match exactly (including trailing slashes)
- Check for http vs https
- Verify the correct environment variables are loaded

### "Invalid client"
- Double-check client ID and secret
- Ensure OAuth app is not in test mode (Google)
- Verify app permissions (Twitter)

### Rate Limiting
After implementing premium tiers, users will have different rate limits:
- Anonymous: 50 searches/hour, 20 applications/day
- Authenticated: 100 searches/hour, 50 applications/day
- Premium: 500 searches/hour, 200 applications/day