# Authentication Architecture

## Overview

JobSeek uses a simplified dual authentication system:
- **Authenticated Users**: NextAuth.js with OAuth providers (Google, Twitter)
- **Anonymous Users**: JWT tokens in httpOnly cookies

## Key Principles

1. **Separation of Concerns**: Each user type has its own token system
2. **Security First**: All tokens stored in httpOnly cookies (XSS protection)
3. **Simplicity**: Minimal code, maximum security
4. **Data Persistence**: Anonymous data stored in localStorage, not tied to cookies

## Authentication Flow

### Authenticated Users
1. User signs in via OAuth provider
2. NextAuth creates session and sets httpOnly session cookie
3. All API requests include session cookie automatically
4. `getUserFromRequest()` returns user info from NextAuth session

### Anonymous Users
1. Frontend calls `/api/auth/anonymous` 
2. Server generates JWT with salted browser fingerprint (unguessable)
3. JWT stored in httpOnly cookie (7-day expiry)
4. User data stored in localStorage (persists independently)
5. `getUserFromRequest()` validates JWT and returns anonymous user info

**Security Note**: Anonymous IDs are generated using a SHA-256 hash of the user-agent + server-side salt (`ANONYMOUS_SALT`). This makes IDs:
- Deterministic (same browser = same ID for session continuity)
- Unguessable (requires knowledge of server-side salt)
- Privacy-friendly (no IP tracking needed)

## Code Structure

### Core Files
- `/lib/auth/auth.config.ts` - NextAuth configuration
- `/lib/auth/anonymous.ts` - Anonymous JWT token management
- `/lib/auth/auth-utils.ts` - Unified user retrieval function
- `/middleware.ts` - Simple auth redirect logic

### API Pattern
All API routes follow this pattern:
```typescript
const user = await getUserFromRequest(request)

if (user?.isAuthenticated) {
  // Authenticated user logic
} else if (user?.isAnonymous) {
  // Anonymous user logic
} else {
  // No user - handle error
}
```

### API Wrapper Functions
We provide three wrapper functions for different authentication requirements:

1. **`withAuth`**: Requires authenticated session only
   - Returns 401 if no NextAuth session exists
   - Use for sensitive operations requiring a logged-in user

2. **`withAuthOrAnonToken`**: Requires either auth session OR anonymous JWT token
   - Returns 401 if neither NextAuth session nor anonymous token exists
   - Use for features available to both authenticated and anonymous users with tokens
   - Anonymous users must first call `/api/auth/anonymous` to obtain a JWT token

3. **`withPublic`**: No authentication required
   - Passes through all requests without auth checks
   - Use for truly public endpoints

## Security Features

1. **httpOnly Cookies**: Tokens cannot be accessed via JavaScript
2. **Secure Flag**: HTTPS-only in production
3. **SameSite Protection**: CSRF protection
4. **Salted IDs**: Anonymous IDs use server-side salt (unguessable)
5. **User-Agent Validation**: Tokens validated against browser user-agent
6. **No Client Storage**: Tokens never exposed to client

## Data Storage

### Authenticated Users
- Profile and data stored in DynamoDB
- Accessed via `storageService` with userId

### Anonymous Users
- Data stored in browser localStorage
- Associated with anonymous ID
- Persists independently of cookie expiry
- Migrated to DynamoDB on sign-up

## Benefits of This Architecture

1. **Reduced Complexity**: ~50% less auth code
2. **Better Security**: Single responsibility for each token type
3. **User Experience**: Anonymous data persists even if cookie expires
4. **Maintainability**: Clear separation between auth types
5. **Performance**: Fewer token verifications needed