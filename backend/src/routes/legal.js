// Public privacy policy page, served at GET /privacy so the Chrome Web Store
// listing has a working privacy-policy URL. Plain HTML, no auth.

import { Router } from 'express';

const router = Router();

const CONTACT = process.env.PRIVACY_CONTACT_EMAIL || 'support@engagement-assistant.app';

router.get('/privacy', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Privacy Policy — Engagement Assistant</title>
<style>
  body{max-width:720px;margin:40px auto;padding:0 20px;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#1d2226;background:#fff}
  h1{font-size:24px} h2{font-size:18px;margin-top:28px} ul{padding-left:20px}
  .muted{color:#6b7280;font-size:14px}
  @media (prefers-color-scheme:dark){body{background:#14181d;color:#e8edf2}.muted{color:#93a1b2}}
</style>
</head>
<body>
  <h1>Privacy Policy — Engagement Assistant</h1>
  <p class="muted">Last updated: 20 November 2026</p>
  <p>Engagement Assistant is a browser extension that helps you write a comment faster on LinkedIn and Instagram. You review every suggestion and post it yourself. This policy explains, in plain words, what we handle and why.</p>

  <h2>What we handle</h2>
  <ul>
    <li><b>The post you choose.</b> When you click "Draft comment", the text of that post (and, for some posts, the image) is sent to our secure server so it can write a suggested comment. We only do this for the post you pick.</li>
    <li><b>Your email (optional).</b> If you give your email, we use it to sign you in and to send you an optional summary of your activity. Nothing else.</li>
    <li><b>Your settings.</b> Your tone and topic choices are saved on your own computer so you do not have to set them again.</li>
  </ul>

  <h2>What we do NOT do</h2>
  <ul>
    <li>We do not post, like, or comment on your behalf. You always click Post.</li>
    <li>We do not sell or rent your data to anyone.</li>
    <li>We do not use your data for advertising, credit, or lending.</li>
    <li>We do not read other tabs or pages. The extension only works on LinkedIn and Instagram, and only when you click our button.</li>
  </ul>

  <h2>Where your data goes</h2>
  <p>The post you choose is sent to our server and to a trusted AI provider only to create the suggested comment. We do not share it with anyone else.</p>

  <h2>Keeping data</h2>
  <p>We keep a record of comments you drafted so the tool can avoid repeating itself and show you your own activity. You can ask us to delete your data at any time.</p>

  <h2>Not affiliated</h2>
  <p>Engagement Assistant is not affiliated with, endorsed by, or connected to LinkedIn or Instagram.</p>

  <h2>Contact</h2>
  <p>Questions or deletion requests: ${CONTACT}</p>
</body>
</html>`);
});

export default router;
