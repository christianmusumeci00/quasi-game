import { SUPABASE_CONFIG } from './supabase-config.js?v=20260730.29';

const PROFILE_KEY = 'quasi-player-name';
const NAME_MIN = 2;
const NAME_MAX = 20;

let clientPromise = null;
let roomConnection = null;

function compactName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

function randomSuffix() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return String(value[0] % 1000000).padStart(6, '0');
  }
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

export function isSupabaseConfigured() {
  const projectUrl = String(SUPABASE_CONFIG.url || '').trim().replace(/\/+$/, '');
  const publicKey = String(SUPABASE_CONFIG.publishableKey || '').trim();
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(projectUrl)
    && /^(sb_publishable_|eyJ)/.test(publicKey);
}

export function getPlayerName() {
  const saved = compactName(localStorage.getItem(PROFILE_KEY));
  if (saved.length >= NAME_MIN) return saved;
  const generated = `QUASI${randomSuffix()}`;
  localStorage.setItem(PROFILE_KEY, generated);
  return generated;
}

export function validatePlayerName(value) {
  const nickname = compactName(value);
  if (nickname.length < NAME_MIN) return { ok: false, nickname, message: 'Usa almeno 2 caratteri.' };
  return { ok: true, nickname, message: '' };
}

async function getOnlineClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('supabase-not-configured');
  }
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const { createClient } = await import(SUPABASE_CONFIG.clientModule);
    const client = createClient(
      SUPABASE_CONFIG.url.trim().replace(/\/+$/, ''),
      SUPABASE_CONFIG.publishableKey.trim(),
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );

    let { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session) {
      const response = await client.auth.signInAnonymously();
      if (response.error) throw response.error;
      session = response.data.session;
    }
    if (!session?.user) throw new Error('anonymous-auth-failed');
    await client.realtime.setAuth(session.access_token);
    client.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.access_token) void client.realtime.setAuth(nextSession.access_token);
    });
    return { client, session, user: session.user };
  })().catch((error) => {
    clientPromise = null;
    throw error;
  });

  return clientPromise;
}

export async function ensureOnlineProfile(preferredName = getPlayerName()) {
  const validation = validatePlayerName(preferredName);
  if (!validation.ok) throw new Error('invalid-player-name');
  const { client, user } = await getOnlineClient();
  const { error } = await client.from('profiles').upsert({
    id: user.id,
    nickname: validation.nickname,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
  localStorage.setItem(PROFILE_KEY, validation.nickname);
  return { userId: user.id, nickname: validation.nickname };
}

export async function savePlayerName(value) {
  const validation = validatePlayerName(value);
  if (!validation.ok) throw new Error(validation.message);
  localStorage.setItem(PROFILE_KEY, validation.nickname);
  if (!isSupabaseConfigured()) return { userId: null, nickname: validation.nickname, localOnly: true };
  return ensureOnlineProfile(validation.nickname);
}

function flattenPresence(state) {
  return Object.values(state || {})
    .flatMap((entries) => Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry === 'object');
}

export async function connectRealtimeRoom({ roomId, nickname, presence = {}, onPresence, onEvent, onStatus }) {
  await disconnectRealtimeRoom();
  const profile = await ensureOnlineProfile(nickname);
  const { client } = await getOnlineClient();
  const topic = `quasi:${String(roomId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96)}`;
  let currentPresence = {
    userId: profile.userId,
    nickname: profile.nickname,
    status: 'online',
    joinedAt: new Date().toISOString(),
    ...presence,
  };

  const channel = client.channel(topic, {
    config: {
      private: true,
      broadcast: { ack: true, self: false },
      presence: { key: profile.userId },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => onPresence?.(flattenPresence(channel.presenceState())))
    .on('broadcast', { event: 'game' }, ({ payload }) => onEvent?.(payload || {}));

  const subscribed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('realtime-timeout')), 10000);
    channel.subscribe(async (status, error) => {
      onStatus?.(status);
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        const trackStatus = await channel.track(currentPresence);
        if (trackStatus !== 'ok') reject(new Error('presence-track-failed'));
        else resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        reject(error || new Error(`realtime-${status.toLowerCase()}`));
      }
    });
  });

  await subscribed;
  roomConnection = {
    client,
    channel,
    roomId,
    profile,
    async send(type, data = {}) {
      const response = await channel.send({
        type: 'broadcast',
        event: 'game',
        payload: {
          type,
          ...data,
          senderId: profile.userId,
          senderName: profile.nickname,
          sentAt: Date.now(),
        },
      });
      if (response !== 'ok') throw new Error('realtime-send-failed');
    },
    async track(patch = {}) {
      currentPresence = { ...currentPresence, ...patch };
      const response = await channel.track(currentPresence);
      if (response !== 'ok') throw new Error('presence-track-failed');
    },
  };
  return roomConnection;
}

export function getRoomConnection() {
  return roomConnection;
}

export async function disconnectRealtimeRoom() {
  if (!roomConnection) return;
  const { client, channel } = roomConnection;
  roomConnection = null;
  try { await channel.untrack(); } catch { /* The socket may already be closed. */ }
  try { await client.removeChannel(channel); } catch { /* Cleanup remains best effort. */ }
}

export async function submitWorldScore({ score, mode, durationMs, levelScores }) {
  const { client } = await getOnlineClient();
  await ensureOnlineProfile(getPlayerName());
  const { data, error } = await client.rpc('submit_score', {
    p_score: Math.round(score),
    p_mode: mode === 'challenge' ? 'challenge' : 'solo',
    p_duration_ms: Math.max(1, Math.round(durationMs)),
    p_level_scores: levelScores.map((value) => Math.round(value)),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function fetchWorldLeaderboard(period = 'all') {
  const { client, user } = await getOnlineClient();
  const safePeriod = ['all', 'week', 'today'].includes(period) ? period : 'all';
  const { data, error } = await client.rpc('get_leaderboard', { p_period: safePeriod });
  if (error) throw error;
  return { rows: data || [], userId: user.id };
}
