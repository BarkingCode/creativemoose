# PhotoApp Email Templates

Branded email templates for Supabase Auth.

## Templates

| File | Supabase Template | Subject Line |
|------|-------------------|--------------|
| `confirm-signup.html` | Confirm signup | Welcome to PhotoApp! Please verify your email |
| `magic-link.html` | Magic link | Your PhotoApp login link |
| `reset-password.html` | Reset password | Reset your PhotoApp password |
| `change-email.html` | Change email address | Confirm your new email address |
| `invite-user.html` | Invite user | You're invited to join PhotoApp! |
| `otp-code.html` | OTP (if enabled) | Your PhotoApp verification code |
| `reauthentication.html` | Reauthentication | Confirm it's you |

## How to Apply

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select the template type (e.g., "Confirm signup")
3. Copy the contents of the corresponding HTML file
4. Paste into the **Message body** field
5. Update the **Subject** with the subject line from the table above
6. Click **Save**

## Branding

- **Background**: `#0f0a0a`
- **Card**: `#1a1a1a`
- **Text**: `#ffffff` / `#a1a1a1`
- **Button**: White with dark text
- **Logo**: `https://photo.barkingcode.com/logo.png`

## Variables

- `{{ .ConfirmationURL }}` - Used in all templates except OTP
- `{{ .Token }}` - Used in OTP template only
