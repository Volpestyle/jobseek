# JWT Token Lifecycle with HttpOnly Cookies

## Overview

This document describes how JWT tokens are stored and managed throughout their lifecycle using httpOnly cookies for maximum security.

## Token Lifecycle Stages

### 1. Token Generation

- Client makes request to `GET /api/auth/anonymous`
- Server generates JWT with browser fingerprint
- Server sets httpOnly cookie with 7-day expiration
- Cookie is automatically stored by browser

### 2. Token Storage

```typescript
// Server sets cookie (client can't access via JS)
response.cookies.set('anonymous-token', token, {
  httpOnly: true,        // ❌ No JS access (XSS protection)
  secure: true,          // ✅ HTTPS only
  sameSite: 'lax',       // ✅ CSRF protection
  maxAge: 604800,        // ✅ 7 days
  path: '/'              // ✅ Available site-wide
});
```

### 3. Token Usage

- Browser automatically sends cookie with every request
- Server reads from `request.cookies.get('anonymous-token')`
- No need to manually include in request body/headers
- Works across page refreshes and browser restarts

### 4. Token Validation

- Server verifies JWT signature on each request
- Validates fingerprint matches (user-agent check)
- Rejects expired or tampered tokens

### 5. Token Expiration

- Browser automatically deletes cookie after 7 days
- Server rejects expired tokens
- Client fetches new token when needed

## Benefits of HttpOnly Cookies

✅ **Maximum Security**: Immune to XSS attacks (no JS access)  
✅ **Automatic**: Browser handles sending with requests  
✅ **Persistent**: Survives page refreshes and browser restarts  
✅ **No Client Storage**: No localStorage/sessionStorage needed  
✅ **Built-in Expiration**: Browser handles cleanup

## The Complete Flow

### 1. First Visit:
- Anonymous user visits site
- `useAnonymousSession` calls `ensureAnonymousToken()`
- Server generates JWT and sets httpOnly cookie
- All subsequent requests include cookie automatically

### 2. API Requests:
- Cookie sent automatically by browser
- Server validates JWT from cookie
- No need to pass token in request body

### 3. Return Visit (within 7 days):
- Cookie still valid
- No new token needed
- Seamless experience

### 4. After 7 Days:
- Cookie expired and deleted by browser
- New token generated on next request
- New 7-day cycle begins

This approach provides the best balance of security, convenience, and user experience for anonymous session tracking.