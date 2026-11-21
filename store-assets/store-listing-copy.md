# Chrome Web Store — submission copy (Engagement Assistant)

Plain-language copy for the Web Store listing, the Privacy tab, and reviewer
notes. Framing: a **writing helper you review and post yourself** — no
automation wording, so review stays smooth. Paste each block into its field.

---

## PRIVACY TAB

### Single purpose description
Engagement Assistant helps you write a thoughtful comment faster. When you are reading a post on LinkedIn or Instagram and want to reply, you click one button and the extension suggests a short comment that fits that post. The suggested text is placed in the comment box so you can read it, change any words, and post it yourself. That is its single purpose: helping you turn your thoughts into a clear comment in seconds. It never posts anything on its own — you always review and click Post.

### Permission justifications

(As of v1.2.1 the extension requests only the "storage" permission plus host
access. The activeTab and scripting permissions were removed because they were
not used — the content script is declared statically in the manifest.)

**storage justification**
Storage saves your own settings on your computer — your preferred tone, the topics you care about, and the login token that connects the extension to your account — so you do not have to type them again every time. It is never used to track you or to store anything from the pages you visit.

**Host permission justification**
The extension only works on LinkedIn and Instagram, because that is where you write these comments. It needs access to those two sites to read the post you choose and to put the suggested comment into the comment box on that page. It also connects to our own server (engagement-assistant-backend.onrender.com), which writes the suggestion using an AI model and keeps our API keys safe on the server, never in the browser. We are not affiliated with, endorsed by, or connected to LinkedIn or Instagram.

### Data use — what the extension handles
- **Website content:** the text (and, for some posts, the image) of the post you choose to draft for. This is sent to our server only to create the suggested comment. It is not sold or used for anything else.
- **Personally identifiable information (email):** optional, used only to sign you in and to send you an optional activity summary.

### Data-use certifications (tick all three — they are true)
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL
https://engagement-assistant-backend.onrender.com/privacy
(Policy text is in PRIVACY-POLICY.md — host it at that URL, or paste your own.)

---

## STORE LISTING TAB

### Name
Engagement Assistant

### Summary (short description, max 132 chars)
Write thoughtful comments on LinkedIn and Instagram faster. Get a smart draft in the comment box — you review and post it.

### Detailed description
Engagement Assistant helps you reply to posts without staring at a blank box.

When you find a post you want to comment on, click "Draft comment". The extension reads that post and suggests a short, friendly comment that fits it. The suggestion appears right in the comment box, so you can:

- Read it
- Change any words you like
- Post it yourself when you are happy

You are always in control. The extension never posts for you and never comments on its own. You click Post.

Why people use it:
- Save time — turn your thoughts into a clear comment in seconds
- Beat the blank box — start from a good draft instead of nothing
- Stay in your voice — set your tone and topics in Settings

Works on LinkedIn and Instagram.

Your privacy:
- Only the post you choose is sent to our secure server, and only to write the suggestion.
- We do not sell your data.
- We are not affiliated with, endorsed by, or connected to LinkedIn or Instagram.

Note: you need an account to use the drafting feature.

### Category
Productivity

### Language
English

---

## TEST INSTRUCTIONS (for the reviewer)
A working test account is required. Use the license key below.
1. Install the extension and click its icon, then open "Settings & onboarding".
2. Open the "Activate your account" section. In the email box enter any email
   (e.g. tester@example.com). Then open "Advanced / self-hosting", paste this
   license key in the "License key" box, and click "Connect with key":
       {{PASTE A LICENSE KEY YOU GENERATED AT /admin HERE}}
3. Go to https://www.linkedin.com (or https://www.instagram.com) and open your feed.
4. Under any post, a "Draft comment" button appears. Click it.
5. After a moment, a suggested comment is placed in the comment box for you to read and edit. The reviewer can edit it or discard it. The extension does not post anything itself.

(To create the key: open https://engagement-assistant-backend.onrender.com/admin,
log in, click "Generate a license key", copy it, and paste it above. Generate a
12-month key so it does not expire during review.)

---

## NOTE ON THE MANIFEST (do before uploading the zip)
Remove the localhost host permission from the published build — it is only for
local development and can slow review. In engagement-assistant/manifest.json,
delete this line from "host_permissions":
    "http://localhost:8787/*"
Keep the LinkedIn, Instagram, and onrender lines.
