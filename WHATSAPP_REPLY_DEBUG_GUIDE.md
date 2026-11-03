# WhatsApp Auto-Reply Debug Guide

## Root Cause Analysis

### Issue
Messages reach the webhook successfully, logs show "dispatched to conversation engine", but **no replies are sent to users**.

### Root Cause
The `smartReply()` function in `conversation-engine.ts` was **silently swallowing all errors** in try/catch blocks with only `console.warn()` calls. When the WhatsApp API fails (due to Meta account restrictions, invalid tokens, rate limits, etc.), errors were logged but never bubbled up, making it appear as if messages were sent successfully.

### Code Pattern (BEFORE FIX)
```typescript
try {
  await sendTextMessage(to, textMsg);
} catch (err) {
  console.warn('[Reply] Text send failed:', err instanceof Error ? err.message : err);
  // ❌ Error swallowed - no indication to caller that send failed
}
```

## Changes Made

### 1. Enhanced WhatsApp Client Error Logging (`client.ts`)

**Added detailed error logging to ALL send functions:**

- `sendTextMessage()` - Now logs full Meta API error response
- `sendAudioMessage()` - Captures HTTP status codes and error details
- `sendImageMessage()` - Logs GIF/image send failures with URLs

**What's logged:**
- ✅ Success: Message ID from Meta API
- ❌ Failure: HTTP status, status text, full error response body from Meta

### 2. Configuration Validation

Added startup checks for required environment variables:
```typescript
// Logs on every API call
[WhatsApp Config] {
  phoneNumberId: '116655001319676' | 'MISSING',
  accessTokenConfigured: true/false,
  accessTokenLength: 284,
  accessTokenPrefix: 'EAAMEMDOPCQw...'
}
```

### 3. Enhanced Conversation Engine Logging (`conversation-engine.ts`)

**Entry/Exit Logging:**
```
[ConversationEngine] ▶ START handleIncomingMessage
[ConversationEngine] ✓ END handleIncomingMessage (success)
[ConversationEngine] ✗ UNHANDLED ERROR in handleIncomingMessage
```

**Critical Send Tracking:**
```
[ConversationEngine] Text reply sent successfully to 917355177189
[ConversationEngine] CRITICAL: Text reply failed: { error, stack }
```

## Testing Steps

### 1. Check Vercel Logs (Production)

Look for these log patterns:

**Good Flow (Success):**
```
[Webhook] Incoming message from 917355177189
[ConversationEngine] ▶ START handleIncomingMessage
[WhatsApp Config] { phoneNumberId: '116655001319676', accessTokenConfigured: true }
[WhatsApp] Text message sent successfully: { to: '917355177189', messageId: 'wamid.xxx' }
[ConversationEngine] Text reply sent successfully to 917355177189
[ConversationEngine] ✓ END handleIncomingMessage
```

**Bad Flow (Meta API Error):**
```
[Webhook] Incoming message from 917355177189
[ConversationEngine] ▶ START handleIncomingMessage
[WhatsApp Config] { phoneNumberId: '116655001319676', accessTokenConfigured: true }
[WhatsApp] Text message send FAILED: {
  to: '917355177189',
  error: 'Request failed with status code 403',
  response: {
    status: 403,
    statusText: 'Forbidden',
    data: {
      error: {
        message: 'Business account is restricted',
        type: 'OAuthException',
        code: 190,
        error_subcode: 2018109
      }
    }
  }
}
[ConversationEngine] CRITICAL: Text reply failed
```

**Missing Config:**
```
[WhatsApp Config] CRITICAL: Missing required environment variables {
  hasPhoneNumberId: false,
  hasAccessToken: false
}
```

### 2. Local Testing

Run the development server:
```bash
npm run dev
```

Send a test webhook payload:
```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "15551234567",
            "phone_number_id": "116655001319676"
          },
          "messages": [{
            "from": "917355177189",
            "id": "wamid.test123",
            "timestamp": "'$(date +%s)'",
            "type": "text",
            "text": {
              "body": "Hello"
            }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

Check console output for error details.

### 3. Check Environment Variables

Verify in Vercel dashboard → Project Settings → Environment Variables:

**Required:**
- ✅ `WHATSAPP_ACCESS_TOKEN` - Must be valid and non-expired
- ✅ `WHATSAPP_PHONE_NUMBER_ID` - Must match your Meta Business Account
- ⚠️ `WHATSAPP_APP_SECRET` - Currently missing (security risk)

### 4. Test Meta API Directly

Test if your access token works:

```bash
curl -X POST "https://graph.facebook.com/v18.0/116655001319676/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "917355177189",
    "type": "text",
    "text": { "body": "Test message" }
  }'
```

**Possible Responses:**

**Success:**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "917355177189", "wa_id": "917355177189" }],
  "messages": [{ "id": "wamid.HBgLOTE3MzU1MTc3MTg5..." }]
}
```

**Account Restricted (Your Current Issue):**
```json
{
  "error": {
    "message": "Business account is restricted",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 2018109,
    "fbtrace_id": "xxx"
  }
}
```

**Invalid Token:**
```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

**Rate Limited:**
```json
{
  "error": {
    "message": "Too many messages sent from this phone number",
    "type": "OAuthException",
    "code": 4,
    "error_subcode": 2018068
  }
}
```

## Known Issues

### 1. Meta Account Permanently Restricted
Your Meta WhatsApp Business Account (ID: `1045535468955334`) is permanently restricted. This means:
- ❌ Cannot send messages via API
- ❌ Cannot test actual sending
- ✅ Can still receive webhooks
- ✅ Code will process messages correctly

**Solution:** Create a new Meta Business Account or appeal the restriction.

### 2. Missing Phone Number ID Mismatch
- Meta Portal shows Test Phone Number ID: `1445394208655254`
- Your `.env` has Phone Number ID: `116655001319676`
- These are different accounts (test vs production)

**Solution:** Verify which Phone Number ID you're actually using.

### 3. Missing App Secret
`WHATSAPP_APP_SECRET` is not set, so webhook signature verification is skipped. This is a security risk.

**Solution:** Get the App Secret from Meta Developer Dashboard and add to `.env`.

## Next Steps

1. **Check Vercel Logs** - Look for the new error patterns above
2. **Identify Specific Error** - The logs will now show exactly why Meta API is rejecting requests
3. **Fix Root Cause**:
   - If account restricted → Create new Meta account
   - If token expired → Generate new access token
   - If rate limited → Implement backoff/retry logic
   - If config missing → Add to Vercel environment variables

## File Changes Summary

**Modified:**
- ✅ `src/lib/whatsapp/client.ts` - Added detailed logging to all send functions
- ✅ `src/lib/whatsapp/conversation-engine.ts` - Enhanced error logging, added entry/exit tracking

**No Breaking Changes:**
- Code still works the same way
- Only added logging - no behavior changes
- Errors still don't crash the server

## Commit Message

```
fix: add comprehensive WhatsApp API error logging

- Add detailed error logging to sendTextMessage, sendAudioMessage, sendImageMessage
- Log Meta API HTTP status codes and error responses
- Add configuration validation logging
- Add entry/exit tracking to conversation engine
- Log full error stack traces for debugging

This helps diagnose why messages reach webhook but replies aren't sent.
Root cause is likely Meta account restriction or invalid tokens.
```
