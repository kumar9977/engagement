// Gemini drafting provider (Google Generative Language API). The API key stays
// on the server. The model id comes from .env so it is swappable.

import { buildSystemPrompt, buildUserPrompt, sanitize } from './prompt.js';

// Fetch an image URL and return a Gemini inlineData part, or null on any
// problem (so drafting falls back to text/caption-only, never breaks).
async function fetchImagePart(imgUrl) {
  const MAX_BYTES = Number(process.env.VISION_MAX_IMAGE_BYTES || 5_000_000);
  // Captured video frames / canvas images arrive as data: URLs (base64).
  if (imgUrl.startsWith('data:')) {
    const m = imgUrl.match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/i);
    if (!m) return null;
    if (Buffer.byteLength(m[2], 'base64') > MAX_BYTES) return null;
    return { inlineData: { mimeType: m[1].toLowerCase(), data: m[2] } };
  }
  try {
    const res = await fetch(imgUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        accept: 'image/avif,image/webp,image/png,image/jpeg,*/*',
      },
      signal: AbortSignal.timeout(Number(process.env.VISION_FETCH_TIMEOUT_MS || 8000)),
    });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) return null;
    return { inlineData: { mimeType: type.toLowerCase(), data: buf.toString('base64') } };
  } catch {
    return null;
  }
}

async function buildImageParts(images) {
  if (!Array.isArray(images) || !images.length) return [];
  const limit = Number(process.env.VISION_MAX_IMAGES || 5);
  const urls = [...new Set(images.filter((u) => typeof u === 'string' && /^(https?:\/\/|data:image\/)/.test(u)))].slice(0, limit);
  const parts = await Promise.all(urls.map(fetchImagePart));
  return parts.filter(Boolean);
}

// One Gemini call for a given model + (optional) image parts + timeout.
// Throws an Error tagged { retryable, fatal } so the cascade can decide whether
// to fall back to the next stage or give up.
async function callGemini({ apiKey, model, systemText, userText, imageParts, timeoutMs, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const generationConfig = { maxOutputTokens: maxTokens, temperature: 0.9, responseMimeType: 'text/plain' };
  if (String(process.env.GEMINI_THINKING || 'false') === 'true') {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userText }, ...imageParts] }],
    generationConfig,
  };

  // Small in-stage retry for transient rate-limit / overload.
  const RETRYABLE = new Set([429, 503, 500, 502, 504]);
  const maxAttempts = Number(process.env.GEMINI_RETRIES || 2);
  let res;
  let lastDetail = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // Timeout / network error -> retryable so the cascade drops to text-only.
      const msg = error?.name === 'TimeoutError' ? 'timeout' : 'network error';
      throw Object.assign(new Error(msg), { status: 502, retryable: true });
    }

    if (res.ok) break;
    lastDetail = await res.text().catch(() => '');
    if (RETRYABLE.has(res.status) && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
      continue;
    }
    // 401/403 = bad key: fatal (no point trying other stages). 400 = this model/
    // request shape unhappy: not fatal, let the cascade try a different model.
    const fatal = res.status === 401 || res.status === 403;
    throw Object.assign(new Error(`Gemini ${res.status}: ${lastDetail.slice(0, 200)}`), {
      status: 502,
      retryable: !fatal,
      fatal,
    });
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY') {
    throw Object.assign(new Error('safety-blocked'), { status: 502, retryable: true });
  }
  const text = (candidate?.content?.parts || []).map((p) => p.text || '').join('').trim();
  const comment = sanitize(text);
  if (!comment) throw Object.assign(new Error('empty'), { status: 502, retryable: true });
  return comment;
}

// Public entry point. Tries, in order, until one succeeds:
//   1. primary model WITH vision  (only when images were provided)
//   2. primary model TEXT-ONLY    (dropping images -> far faster, rarely times out)
//   3. fallback model TEXT-ONLY
// This makes a slow/overloaded vision call degrade into a quick text draft
// instead of surfacing a "timeout" to the user.
export async function draftComment({ settings, category, postText, postAuthor, platform, postType, images = [], avoid = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY is not set on the server'), { status: 500 });

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';
  const maxTokens = Number(process.env.GEMINI_MAX_TOKENS || 800);
  const visionTimeout = Number(process.env.LLM_TIMEOUT_MS || 45000);
  const textTimeout = Number(process.env.GEMINI_FALLBACK_TIMEOUT_MS || 20000);

  const systemText = buildSystemPrompt(settings, avoid);
  const userText = (hasImages) =>
    buildUserPrompt({ category, postText, postAuthor, platform, postType, hasImages });

  // Only build (fetch/decode) image parts if there is text we can fall back to.
  const hasUsableText = typeof postText === 'string' && postText.trim().length >= 10;
  const imageParts = images.length ? await buildImageParts(images) : [];

  const stages = [];
  if (imageParts.length) {
    // With-vision attempt. If there is no caption to fall back to, give vision
    // the full timeout budget since it is the only way to understand the post.
    stages.push({ model: primaryModel, parts: imageParts, timeoutMs: visionTimeout, hasImages: true });
  }
  if (hasUsableText || !imageParts.length) {
    stages.push({ model: primaryModel, parts: [], timeoutMs: imageParts.length ? textTimeout : visionTimeout, hasImages: false });
    if (fallbackModel !== primaryModel) {
      stages.push({ model: fallbackModel, parts: [], timeoutMs: textTimeout, hasImages: false });
    }
  }

  let lastErr;
  for (const st of stages) {
    try {
      return await callGemini({
        apiKey,
        model: st.model,
        systemText,
        userText: userText(st.hasImages),
        imageParts: st.parts,
        timeoutMs: st.timeoutMs,
        maxTokens,
      });
    } catch (err) {
      lastErr = err;
      if (err.fatal) break; // bad API key etc. — stop and surface
      // otherwise fall through to the next (faster / text-only) stage
    }
  }
  throw lastErr || Object.assign(new Error('Could not draft a comment'), { status: 502 });
}
