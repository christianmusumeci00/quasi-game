export function createChallengeSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  }
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function encodeChallenge({ deck, seed, score = null, startAt = null }) {
  const payload = JSON.stringify({ v: 1, d: deck, r: seed, s: score, t: startAt });
  return btoa(payload).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodeChallenge(code, validIds) {
  try {
    const normalized = code.replaceAll('-', '+').replaceAll('_', '/');
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    const deck = Array.isArray(payload.d) ? payload.d : [];
    const hasScore = payload.s !== null && payload.s !== undefined && payload.s !== '';
    const score = hasScore ? Number(payload.s) : null;
    const startAt = payload.t === null || payload.t === undefined ? null : Number(payload.t);
    const seed = String(payload.r || '');
    if (payload.v !== 1 || deck.length !== 10 || new Set(deck).size !== 10) return null;
    if (deck.some((id) => !validIds.has(id)) || !seed || seed.length > 80) return null;
    if (hasScore && (!Number.isFinite(score) || score < 0 || score > 100)) return null;
    if (startAt !== null && (!Number.isFinite(startAt) || startAt <= 0)) return null;
    if (!hasScore && startAt === null) return null;
    return { deck, seed, score: hasScore ? Math.round(score) : null, startAt };
  } catch {
    return null;
  }
}

export function seededRandom(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6D2B79F5;
    let value = hash;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
