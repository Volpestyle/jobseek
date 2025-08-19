# Anonymous Token Lifecycle

## Overview

JobSeek uses JWT tokens with httpOnly cookies to track anonymous users. Tokens use random IDs (no fingerprinting) and implement a sliding expiration window to maintain sessions for active users while cleaning up inactive ones.

## Token Behavior

### Initial Token Creation
- User visits site without authentication
- Server generates JWT with random ID via `GET /api/auth/anonymous`
- Token stored in httpOnly cookie with 1-day expiration
- Cookie name: `anonymous-token`

### Active Session Extension
- Each session-related API call refreshes the token
- Same anonymous ID is preserved
- Expiration extended to 1 day from current request
- User maintains consistent identity while active

### Expired Token Handling
- After 1 day of inactivity, token expires
- Next API call returns 401 (unauthorized)
- Client requests new token from `/api/auth/anonymous`
- New random ID is generated (fresh start)
- Old sessions/data associated with expired ID are already cleaned up

## Implementation Details

### Cookie Settings
```typescript
{
  httpOnly: true,        // No JS access (XSS protection)
  secure: true,          // HTTPS only in production
  sameSite: 'lax',       // CSRF protection
  maxAge: 86400,         // 1 day (86400 seconds)
  path: '/'              // Available site-wide
}
```

### Token Structure
```typescript
{
  id: string,    // Random hex string (32 chars)
  iat: number,   // Issued at timestamp
  exp: number    // Expiration timestamp
}
```

### API Endpoints That Refresh Tokens

Session-related endpoints automatically refresh anonymous tokens:
- `/api/wallcrawler/sessions/*` - Session management
- `/api/wallcrawler/search/*` - Job search operations  
- `/api/jobs/search-results/*` - Search results
- `/api/wallcrawler/apply` - Job applications

User data endpoints require authentication (no anonymous access):
- `/api/user/profile` - User profiles
- `/api/user/searches/saved` - Saved searches
- `/api/resume/upload` - Resume management

## Security Benefits

✅ **HttpOnly Cookies**: Immune to XSS attacks  
✅ **Random IDs**: No device fingerprinting or tracking  
✅ **Short Expiration**: Limits exposure window  
✅ **Automatic Cleanup**: Inactive sessions expire naturally  
✅ **HTTPS Only**: Secure transmission in production  
✅ **CSRF Protection**: SameSite=lax cookie attribute

## Client Usage

```typescript
// Hook automatically manages anonymous tokens
const { user, isAnonymous } = useAnonymousSession();

// API calls include cookie automatically
fetch('/api/wallcrawler/sessions', {
  credentials: 'include'  // Browser sends cookies
});
```

## Privacy Considerations

- No fingerprinting or device tracking
- Random IDs provide complete anonymity
- Sessions expire after 1 day of inactivity
- No persistent tracking across session boundaries
- Users get fresh identity after expiration

This approach balances user experience (maintaining sessions during active use) with privacy (no long-term tracking) and security (httpOnly cookies, short expiration).