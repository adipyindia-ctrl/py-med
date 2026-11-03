# WhatsApp Webhook Configuration Verification

## 🔴 CRITICAL ISSUE FOUND

Your webhook is NOT reachable by Meta because:
- `.env` has `NEXT_PUBLIC_APP_URL="http://localhost:3000"`
- Meta cannot access localhost URLs
- Your webhook must use your Vercel production URL

## ✅ Step-by-Step Fix (5 minutes)

### Step 1: Get Your Vercel Production URL

1. Go to https://vercel.com/dashboard
2. Click on your `py-med` project
3. Copy the **Production URL** (e.g., `https://py-med-xxxx.vercel.app`)

### Step 2: Configure Meta Webhook

1. Go to https://developers.facebook.com/apps
2. Select your WhatsApp app
3. Go to **WhatsApp** → **Configuration**
4. Click **Edit** under Webhook

**Enter:**
```
Callback URL: https://YOUR-VERCEL-URL.vercel.app/api/webhook/whatsapp
Verify Token: PYINDIA
```

5. Click **Verify and Save**
6. You should see a green checkmark ✅

### Step 3: Subscribe to Webhook Fields

Scroll down to **Webhook fields** section:

☑️ Check **messages**
☑️ Check **message_status** (optional)

Click **Save**

### Step 4: Update Vercel Environment Variables

1. Go to Vercel Dashboard → py-med → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_APP_URL`:
   - Find existing `NEXT_PUBLIC_APP_URL`
   - Click Edit
   - Change from `http://localhost:3000` to `https://YOUR-VERCEL-URL.vercel.app`
   - Click Save

3. Add `WHATSAPP_APP_SECRET` (required for security):
   - Go to Meta Developer Console → Settings → Basic
   - Copy the **App Secret**
   - Add to Vercel: Key = `WHATSAPP_APP_SECRET`, Value = (your app secret)

### Step 5: Redeploy

**Option A - Using Vercel Dashboard:**
1. Go to **Deployments** tab
2. Click three dots on latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes for deployment to complete

**Option B - Using Git:**
```bash
cd "c:\my Projects\Medical\py-med"
git commit --allow-empty -m "trigger redeploy with correct webhook URL"
git push origin main
```

### Step 6: Test Webhook Verification

Replace `YOUR-VERCEL-URL` with your actual URL:

```bash
curl "https://YOUR-VERCEL-URL.vercel.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=PYINDIA&hub.challenge=test123"
```

**Expected response:** `test123`

If you get `{"error":"Forbidden"}`, the verify token is wrong.

### Step 7: Test by Sending WhatsApp Message

1. Open WhatsApp on your phone
2. Send a message to your WhatsApp Business number
3. **Immediately** open Vercel Dashboard → Logs (Real-time)

**Expected logs (SUCCESS - Webhook working):**
```
[Webhook] 📨 Incoming message from 917355177189
[Webhook] Message type: text, text: Hello
[Webhook] ✓ Message dispatched to conversation engine
[ConversationEngine] ▶ START handleIncomingMessage
```

**If you still see ONLY:**
```
WHATSAPP_APP_SECRET not set — skipping signature verification
```

Then Meta is still not calling your webhook. Double-check Step 2 and Step 3.

## 🔍 Diagnostic Tests

### Test 1: Can Meta reach your webhook?

```bash
# Replace YOUR-VERCEL-URL with your actual URL
curl -X POST https://YOUR-VERCEL-URL.vercel.app/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[]}'
```

**Expected:** `{"status":"ok"}`
**If 500 error:** Your deployment has issues
**If 404 error:** Webhook route not found

### Test 2: Is your Meta access token valid?

```bash
curl "https://graph.facebook.com/v18.0/116655001319676?access_token=YOUR_ACCESS_TOKEN"
```

**Expected:** JSON with phone number info
**If error 190:** Token is invalid/expired
**If error 403:** Account is restricted

### Test 3: Can you send messages via Meta API?

```bash
curl -X POST "https://graph.facebook.com/v18.0/116655001319676/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "917355177189",
    "type": "text",
    "text": { "body": "Test from curl" }
  }'
```

**Success:**
```json
{
  "messaging_product": "whatsapp",
  "messages": [{ "id": "wamid.xxx" }]
}
```

**Account Restricted (Error 2018109):**
```json
{
  "error": {
    "message": "Business account is restricted",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 2018109
  }
}
```

If you get error 2018109, your account is permanently restricted. You'll need to:
1. Appeal the restriction in Meta Business Suite
2. OR create a new Meta Business Account
3. OR use a different WhatsApp Business number

## 📋 Configuration Checklist

Before testing, verify:

**Meta Developer Console:**
- [ ] Webhook URL = `https://YOUR-VERCEL-URL.vercel.app/api/webhook/whatsapp`
- [ ] Verify token = `PYINDIA`
- [ ] Webhook status shows green checkmark ✅
- [ ] `messages` field is subscribed ☑️

**Vercel Environment Variables:**
- [ ] `NEXT_PUBLIC_APP_URL` = `https://YOUR-VERCEL-URL.vercel.app` (NOT localhost)
- [ ] `WHATSAPP_VERIFY_TOKEN` = `PYINDIA`
- [ ] `WHATSAPP_ACCESS_TOKEN` = (your Meta token, ~284 chars)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` = `116655001319676`
- [ ] `WHATSAPP_APP_SECRET` = (from Meta console)

**After Configuration:**
- [ ] Redeployed on Vercel
- [ ] Webhook verification test passes (returns challenge)
- [ ] Test WhatsApp message sent
- [ ] Vercel logs show `[Webhook] Incoming message from`

## 🎯 Expected Behavior After Fix

### Scenario 1: Webhook Working, Account OK
```
Send WhatsApp message
  ↓
[Webhook] Incoming message from 917355177189
  ↓
[ConversationEngine] START handleIncomingMessage
  ↓
[WhatsApp] Text message sent successfully
  ↓
✅ You receive automatic reply
```

### Scenario 2: Webhook Working, Account Restricted
```
Send WhatsApp message
  ↓
[Webhook] Incoming message from 917355177189
  ↓
[ConversationEngine] START handleIncomingMessage
  ↓
[WhatsApp] Text message send FAILED: error 403, subcode 2018109
  ↓
❌ No reply (need to fix Meta account restriction)
```

### Scenario 3: Webhook NOT Working (Current State)
```
Send WhatsApp message
  ↓
Only log: "WHATSAPP_APP_SECRET not set"
  ↓
No [Webhook] Incoming message logs
  ↓
❌ Meta is not calling your webhook
```

## 🚨 Common Mistakes

1. **Using localhost URL** - Meta cannot reach `http://localhost:3000`
2. **Wrong verify token** - Must match exactly (case-sensitive)
3. **Forgot to subscribe to messages field** - Webhook verified but no events sent
4. **Not redeploying after env var changes** - Old deployment still uses old values
5. **Wrong webhook URL path** - Must be `/api/webhook/whatsapp` exactly

## 📞 Still Not Working?

If after following all steps you still don't see webhook logs, provide:

1. Your Vercel production URL (e.g., `https://py-med-xxx.vercel.app`)
2. Screenshot of Meta webhook configuration page
3. Result of webhook verification test (curl command from Test 1)
4. Screenshot of Vercel environment variables (blur sensitive values)

---

**Fix the webhook URL first. Everything else depends on Meta being able to reach your Vercel deployment.** 🎯
