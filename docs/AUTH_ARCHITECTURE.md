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
2. Server generates JWT with browser fingerprint
3. JWT stored in httpOnly cookie (7-day expiry)
4. User data stored in localStorage (persists independently)
5. `getUserFromRequest()` validates JWT and returns anonymous user info

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

## Security Features

1. **httpOnly Cookies**: Tokens cannot be accessed via JavaScript
2. **Secure Flag**: HTTPS-only in production
3. **SameSite Protection**: CSRF protection
4. **Fingerprint Validation**: Anonymous tokens tied to browser
5. **No Client Storage**: Tokens never exposed to client

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