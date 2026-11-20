// Provider dispatcher. Set LLM_PROVIDER in .env to 'gemini' or 'claude'.
// The rest of the app imports draftComment + CATEGORIES from here and does not
// care which provider is active.

import { draftComment as claudeDraft } from './claude.js';
import { draftComment as geminiDraft } from './gemini.js';
import { CATEGORIES } from './prompt.js';

const PROVIDERS = { claude: claudeDraft, gemini: geminiDraft };

export function activeProvider() {
  return (process.env.LLM_PROVIDER || 'claude').toLowerCase();
}

function claudeConfigured() {
  const k = process.env.ANTHROPIC_API_KEY || '';
  if (!k.startsWith('sk-ant-') || k.length < 30) return false;
  if (/x{6,}/i.test(k)) return false; // reject the "sk-ant-xxxx..." placeholder
  return true;
}

export async function draftComment(args) {
  const name = activeProvider();
  const fn = PROVIDERS[name];
  if (!fn) {
    throw Object.assign(new Error(`Unknown LLM_PROVIDER "${name}". Use "gemini" or "claude".`), { status: 500 });
  }

  try {
    return await fn(args);
  } catch (err) {
    // Last-resort cross-provider fallback: if Gemini exhausted its own cascade
    // and a real Claude key is configured, draft with Claude (text-only) so the
    // user still gets a comment instead of an error.
    if (name === 'gemini' && claudeConfigured()) {
      try {
        return await claudeDraft({ ...args, images: [] });
      } catch {
        /* fall through to the friendly error below */
      }
    }
    // Never surface raw "timed out" / provider internals to the user.
    throw Object.assign(
      new Error('Could not draft a comment right now. Please try again in a moment.'),
      { status: 503 }
    );
  }
}

export { CATEGORIES };
