// path: src/utils/errors.js
//
// Item 15 (build decisions): nothing dev-facing should reach the user raw.
// api/client.js throws new Error(message) where message is whatever text
// the backend response body contained - on an unhandled backend error this
// can be a raw stack trace or a full HTML error page (Flask/Werkzeug's
// default response for an unexpected exception), not something a user
// should ever see. friendlyError() is the single place every call site
// should route a caught error through before showing it, instead of each
// screen doing its own `error.message || 'fallback'`.

const HTML_MARKERS = ['<html', '<!doctype', '<body', '<title>'];
const STACK_MARKERS = ['Traceback (most recent call last)', ' at ', '.py", line', 'File "'];
const MAX_LEN = 200;

/**
 * Returns a message safe to show a user: either the original error message,
 * if it looks like a short, plain sentence a backend meant for display, or
 * the given fallback otherwise.
 */
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  const raw = error && typeof error.message === 'string' ? error.message.trim() : '';
  if (!raw) return fallback;
  if (looksLikeDevOutput(raw)) return fallback;
  return raw;
}

function looksLikeDevOutput(text) {
  const lower = text.toLowerCase();
  if (HTML_MARKERS.some(marker => lower.includes(marker))) return true;
  if (STACK_MARKERS.some(marker => text.includes(marker))) return true;
  if (text.length > MAX_LEN) return true;
  // Multi-line text is almost always a stack trace or HTML dump, never a
  // short plain-English backend message.
  if (text.includes('\n')) return true;
  return false;
}
