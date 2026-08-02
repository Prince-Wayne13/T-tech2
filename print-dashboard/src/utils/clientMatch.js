// path: src/utils/clientMatch.js
//
// Item 6 (build decisions): clients typed on a Job/Proposal should become
// real Client records automatically, not stay as plain text - matching
// close-enough spellings to an existing client instead of creating a
// duplicate every time. This is the matching logic only; the interactive
// "Did you mean X?" prompt lives in components/Modals.jsx's
// ClientMatchModal, and the actual create/link call happens in the two
// callers (Jobs.jsx, Proposals.jsx) via resolveClientForSave() below.

/** Trim + collapse internal whitespace + lowercase, for comparison only -
 * never used as the value actually saved. "John Banda" and
 * "john  banda" both normalize to "john banda". */
export function normalizeClientName(name) {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Plain Levenshtein distance - no dependency needed for this. Only ever
// called on short client-name strings, so the O(n*m) cost is negligible.
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j += 1) prev[j] = curr[j];
  }
  return prev[n];
}

/** 0..1, where 1 is an exact match (after normalization) and 0 is
 * completely different. Used only to decide whether to show a "Did you
 * mean X?" suggestion - never used to auto-link, since that's reserved
 * for a true exact match after cleanup. */
function similarity(a, b) {
  const normA = normalizeClientName(a);
  const normB = normalizeClientName(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  const distance = levenshtein(normA, normB);
  return 1 - distance / Math.max(normA.length, normB.length);
}

// Close enough to suggest ("Did you mean X?") but not close enough to be
// the same normalized string - e.g. one typo, a missing/extra letter.
// Deliberately conservative: "John" vs "Joan" (0.75) suggests; "John" vs
// "Jane" (0.5) does not, since that's plausibly two different people.
const SUGGEST_THRESHOLD = 0.7;

/**
 * Given the raw typed client name and the list of existing clients (as
 * returned by GET /clients), decides what should happen before saving a
 * Job/Proposal:
 *   - { status: 'empty' }            - nothing typed, caller should fall
 *                                       back to "Walk-in Client" as today.
 *   - { status: 'exact', client }    - normalized match found; link
 *                                       silently, no prompt.
 *   - { status: 'suggest', client }  - close but not exact; caller should
 *                                       show ClientMatchModal before
 *                                       proceeding.
 *   - { status: 'new' }              - no match close enough; caller
 *                                       should create a new Client.
 */
export function resolveClientMatch(typedName, clients) {
  const cleaned = (typedName || '').trim();
  if (!cleaned) return { status: 'empty' };

  const normalizedTyped = normalizeClientName(cleaned);
  const exact = clients.find(c => normalizeClientName(c.name) === normalizedTyped);
  if (exact) return { status: 'exact', client: exact };

  let best = null;
  let bestScore = 0;
  for (const client of clients) {
    const score = similarity(cleaned, client.name);
    if (score > bestScore) {
      bestScore = score;
      best = client;
    }
  }
  if (best && bestScore >= SUGGEST_THRESHOLD) {
    return { status: 'suggest', client: best };
  }
  return { status: 'new' };
}
