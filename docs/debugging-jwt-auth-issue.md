# JWT Authentication Issue in Edge Functions

## Problem

Image generation was failing with "Invalid JWT" errors (401 Unauthorized) on the `generate-single` edge function, even though the `reserve-credit` function succeeded with the same token.

### Error Messages
```
[generateSingleImage] Response error: { status: 401, data: { code: 401, message: 'Invalid JWT' } }
```

## Root Cause Analysis

### Investigation Steps

1. **Traced the authentication flow**: Both functions use the same `validateAuth()` helper in `_shared/auth.ts`
2. **Verified token handling**: The same `currentSession.access_token` was being passed to both functions
3. **Checked edge function secrets**: Found that the `SUPABASE_ANON_KEY` digest in secrets didn't match the expected key from `.env.local`

### Root Cause

The original `validateAuth()` function was creating a Supabase client like this:

```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { Authorization: `Bearer ${token}` },
  },
});
const { data: { user }, error } = await supabase.auth.getUser();
```

This approach has a subtle issue: when calling `getUser()` without a token parameter, the Supabase client uses the token from the `Authorization` header. However, the validation depends on both:
1. The user's JWT being valid
2. The `supabaseAnonKey` being from the **same project** as the JWT

If the anon key in the edge function's environment doesn't match the project's current anon key (e.g., due to key rotation or misconfiguration), the validation fails with "Invalid JWT".

## Solution

Changed `validateAuth()` to use the **service role client** with explicit token parameter:

```typescript
// Use service role client to validate user token
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// getUser with token parameter validates the JWT directly
const { data: { user }, error } = await supabase.auth.getUser(token);
```

### Why This Works

1. **Service role bypasses anon key issues**: The service role key can validate any token for the project
2. **Explicit token parameter**: Passing the token to `getUser(token)` ensures it's validated directly
3. **No dependency on headers**: The validation doesn't rely on the Authorization header configuration

## File Changes

- `supabase/functions/_shared/auth.ts`: Updated `validateAuth()` to use service role client

## Prevention

1. **Use service role for token validation** in edge functions when you only need to verify the user's identity
2. **Use anon key client** only when you need RLS (Row Level Security) to apply based on the user's token
3. **Monitor for key rotation**: If project keys are regenerated, edge functions using auto-injected `SUPABASE_*` variables should update automatically, but verify after key rotation

## Related Files

- `supabase/functions/_shared/auth.ts` - Authentication utilities
- `supabase/functions/generate-single/index.ts` - Image generation function
- `supabase/functions/reserve-credit/index.ts` - Credit reservation function
- `lib/fal.ts` - Client-side API calls
