# JWT Authentication Issue in Edge Functions

## Problem

Image generation was failing with "Invalid JWT" errors (401 Unauthorized) on all Edge Functions (`reserve-credit`, `generate-single`, etc.).

### Error Messages
```
[reserveCredit] Response error: { status: 401, data: { code: 401, message: 'Invalid JWT' } }
```

## Root Cause Analysis

### Investigation Steps

1. **Traced the authentication flow**: All functions use the same `validateAuth()` helper in `_shared/auth.ts`
2. **Verified token handling**: The client sends a valid JWT (`eyJhbGciOiJFUzI1NiIs...`, 691 chars) via `Authorization: Bearer <token>`
3. **Checked deployed secrets**: `SUPABASE_SERVICE_ROLE_KEY` was present and correct
4. **Identified the actual error source**: The error format `{ code: 401, message: 'Invalid JWT' }` is from the **Supabase Edge Functions gateway**, not from the function code itself (which would return `{ error: "Unauthorized" }`)

### Root Cause

**Two layers of issues:**

#### 1. Gateway JWT Verification (Primary Blocker)

Supabase Edge Functions have a gateway that verifies JWTs **before** the function code executes. This project's JWTs use the `ES256` algorithm (visible in the `eyJhbGciOiJFUzI1NiIs` header prefix). The gateway was rejecting these tokens, returning 401 before the function code ever ran.

The `{ code: 401, message: 'Invalid JWT' }` response format is the gateway's format — distinct from the function's own `{ error: "..." }` format.

#### 2. Original validateAuth() Used Anon Key (Historical)

The original `validateAuth()` created a Supabase client with the anon key:

```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});
const { data: { user }, error } = await supabase.auth.getUser();
```

This depended on the anon key matching the project. If keys rotated or were misconfigured, validation failed silently.

## Solution

### Fix 1: Deploy with `--no-verify-jwt`

Bypass the gateway's JWT verification and let the function code handle auth internally:

```bash
supabase functions deploy reserve-credit --no-verify-jwt
supabase functions deploy generate-single --no-verify-jwt
supabase functions deploy preview --no-verify-jwt
supabase functions deploy delete-account --no-verify-jwt
supabase functions deploy invite-user --no-verify-jwt
```

**Why this is safe:** The `validateAuth()` function already validates the JWT using the service role client with `supabase.auth.getUser(token)`, which checks the token directly against the auth service. The gateway check was redundant and was the one actually failing.

**All future deploys must include `--no-verify-jwt`** for any function that handles its own auth.

### Fix 2: Use Service Role Client for Token Validation

Updated `validateAuth()` to use the service role client with an explicit token parameter:

```typescript
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export async function validateAuth(req: Request): Promise<AuthResult> {
  // Early check for missing secret
  if (!supabaseServiceKey) {
    console.error("[validateAuth] SUPABASE_SERVICE_ROLE_KEY is not set!");
    return { success: false, error: "Server configuration error" };
  }

  // ... extract token from Authorization header ...

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // getUser with token parameter validates the JWT directly
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { success: false, error: error?.message || "Invalid token" };
  }
  return { success: true, userId: user.id };
}
```

### Key Changes

1. **Removed `!` non-null assertion** on `SUPABASE_SERVICE_ROLE_KEY` — now detects missing secret early
2. **Service role client** validates any token for the project (bypasses anon key issues)
3. **Explicit `getUser(token)`** — validates the JWT directly rather than relying on header injection
4. **Removed debug logging** — verbose JWT/token logging removed after fix confirmed

## How to Diagnose Gateway vs Function Auth Errors

| Response Format | Source |
|----------------|--------|
| `{ code: 401, message: "Invalid JWT" }` | Supabase **gateway** rejected the token before function ran |
| `{ error: "Unauthorized" }` or `{ error: "Missing or invalid authorization header" }` | Your **function code** (`validateAuth`) rejected the token |

If you see the gateway format, the fix is `--no-verify-jwt` on deploy.

## File Changes

- `supabase/functions/_shared/auth.ts` — Service role client, safety check, debug cleanup
- All Edge Functions — Redeployed with `--no-verify-jwt`

## Prevention

1. **Always deploy with `--no-verify-jwt`** for functions that handle their own auth via `validateAuth()`
2. **Use service role for token validation** — not the anon key
3. **Check the error format** to distinguish gateway vs function-level auth failures
4. **Don't use `!` assertions** on `Deno.env.get()` for secrets — add early guards instead

## Related Files

- `supabase/functions/_shared/auth.ts` - Authentication utilities
- `supabase/functions/generate-single/index.ts` - Image generation function
- `supabase/functions/reserve-credit/index.ts` - Credit reservation function
- `lib/fal.ts` - Client-side API calls
