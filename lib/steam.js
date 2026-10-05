// Steam sign-in, the session cookie, and Web API calls, shared by the Functions.
//
// Steam has no OAuth. "Sign in through Steam" is OpenID 2.0, which proves *who*
// someone is and nothing more — there's no token that reads their library on
// their behalf. The library comes from the public Web API with our own key, so
// it only works when the profile's "Game details" are public.

const STEAM_OPENID = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

const SESSION_COOKIE = 'gc_session';
export const SESSION_TTL = 60 * 60 * 24 * 30; // seconds

const encoder = new TextEncoder();

export function originOf(request) {
    const url = new URL(request.url);
    // Behind the Vite dev proxy, request.url points at wrangler's port. The
    // Host header still carries the address the browser actually used, and
    // that's what Steam has to send people back to.
    return `${url.protocol}//${request.headers.get('host') || url.host}`;
}

export function isConfigured(env) {
    return Boolean(env.STEAM_API_KEY && env.SESSION_SECRET);
}

// Every answer depends on who's signed in, but the URL doesn't say who that
// is — so nothing may be cached, or switching Steam accounts serves the
// previous account's library from the browser cache.
export function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
    });
}

// ─── OpenID ──────────────────────────────────────────────────────────────────

export function loginUrl(origin) {
    const params = new URLSearchParams({
        'openid.ns': OPENID_NS,
        'openid.mode': 'checkid_setup',
        'openid.return_to': `${origin}/api/auth/callback`,
        'openid.realm': origin,
        'openid.identity': IDENTIFIER_SELECT,
        'openid.claimed_id': IDENTIFIER_SELECT,
    });
    return `${STEAM_OPENID}?${params}`;
}

// Returns the 64-bit SteamID if Steam vouches for this callback, else null.
export async function verifyLogin(url, origin) {
    const q = url.searchParams;
    if (q.get('openid.mode') !== 'id_res') return null;
    if (q.get('openid.op_endpoint') !== STEAM_OPENID) return null;

    // An assertion Steam minted for some other site is still validly signed.
    // Pinning return_to to our own callback stops one being replayed here.
    if (!(q.get('openid.return_to') || '').startsWith(`${origin}/api/auth/callback`)) return null;

    const signed = (q.get('openid.signed') || '').split(',');
    if (!signed.includes('claimed_id') || !signed.includes('return_to')) return null;

    const match = CLAIMED_ID.exec(q.get('openid.claimed_id') || '');
    if (!match) return null;

    // Hand the assertion back to Steam and let it check its own signature.
    const body = new URLSearchParams();
    for (const [key, value] of q) {
        if (key.startsWith('openid.')) body.set(key, value);
    }
    body.set('openid.mode', 'check_authentication');

    const res = await fetch(STEAM_OPENID, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!res.ok) return null;

    return /^is_valid\s*:\s*true\s*$/m.test(await res.text()) ? match[1] : null;
}

// ─── Session cookie ──────────────────────────────────────────────────────────
// `<steamid>.<expiry>.<hmac>` — stateless, so there's no database to keep.

function hmacKey(secret) {
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

function toBase64Url(buffer) {
    let s = '';
    for (const byte of new Uint8Array(buffer)) s += String.fromCharCode(byte);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
    const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function createSession(steamid, secret) {
    const payload = `${steamid}.${Math.floor(Date.now() / 1000) + SESSION_TTL}`;
    const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
    return `${payload}.${toBase64Url(sig)}`;
}

export async function readSession(request, secret) {
    const cookie = request.headers.get('cookie') || '';
    const value = cookie
        .split(/;\s*/)
        .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
        ?.slice(SESSION_COOKIE.length + 1);
    if (!value) return null;

    const [steamid, expires, sig] = value.split('.');
    if (!steamid || !expires || !sig) return null;
    if (Number(expires) < Date.now() / 1000) return null;

    try {
        // subtle.verify compares in constant time, unlike checking strings.
        const ok = await crypto.subtle.verify(
            'HMAC',
            await hmacKey(secret),
            fromBase64Url(sig),
            encoder.encode(`${steamid}.${expires}`)
        );
        return ok ? steamid : null;
    } catch {
        return null;
    }
}

export function sessionCookie(origin, value, maxAge) {
    const secure = origin.startsWith('https:') ? '; Secure' : '';
    return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// ─── Web API ─────────────────────────────────────────────────────────────────

export async function steamApi(path, params, key) {
    const url = new URL(`https://api.steampowered.com/${path}`);
    url.search = new URLSearchParams({ ...params, key, format: 'json' });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam API ${path} returned ${res.status}`);
    return res.json();
}

const ICON_BASE = 'https://media.steampowered.com/steamcommunity/public/images/apps';

// Someone's owned games, or null when their "Game details" are private — Steam
// doesn't treat that as an error, it just answers with an empty object.
export async function ownedGames(steamid, key) {
    const data = await steamApi(
        'IPlayerService/GetOwnedGames/v1/',
        { steamid, include_appinfo: 1, include_played_free_games: 1 },
        key
    );
    const games = data.response?.games;
    if (!games) return null;

    return games.map((g) => ({
        appid: g.appid,
        name: g.name,
        playtime: g.playtime_forever ?? 0,
        lastPlayed: g.rtime_last_played ?? 0,
        icon: g.img_icon_url ? `${ICON_BASE}/${g.appid}/${g.img_icon_url}.jpg` : null,
    }));
}

export async function playerSummary(steamid, key) {
    const data = await steamApi('ISteamUser/GetPlayerSummaries/v2/', { steamids: steamid }, key);
    return data.response?.players?.[0] ?? null;
}

// GetPlayerSummaries takes at most 100 IDs per call.
async function playerSummaries(steamids, key) {
    const batches = [];
    for (let i = 0; i < steamids.length; i += 100) {
        batches.push(
            steamApi('ISteamUser/GetPlayerSummaries/v2/', { steamids: steamids.slice(i, i + 100).join(',') }, key)
        );
    }
    return (await Promise.all(batches)).flatMap((data) => data.response?.players ?? []);
}

// Someone's friends with names and avatars, or null when their friends list is
// private. Unlike the games endpoint, Steam answers a private list with a 401.
export async function friendList(steamid, key) {
    const url = new URL('https://api.steampowered.com/ISteamUser/GetFriendList/v1/');
    url.search = new URLSearchParams({ steamid, relationship: 'friend', key, format: 'json' });
    const res = await fetch(url);
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`Steam API GetFriendList returned ${res.status}`);

    const ids = ((await res.json()).friendslist?.friends ?? []).map((f) => f.steamid);
    const players = await playerSummaries(ids, key);
    return players
        .map((p) => ({ steamid: p.steamid, name: p.personaname, avatar: p.avatarmedium ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

// Accepts whatever people tend to paste: a /profiles/ link, an /id/ custom
// URL, a bare 17-digit SteamID, or just the custom URL name.
export async function resolveProfile(input, key) {
    const text = String(input || '').trim();

    let match = /steamcommunity\.com\/profiles\/(\d{17})/.exec(text) || /^(\d{17})$/.exec(text);
    if (match) return match[1];

    match = /steamcommunity\.com\/id\/([\w-]{2,32})/.exec(text) || /^([\w-]{2,32})$/.exec(text);
    if (!match) return null;

    const data = await steamApi('ISteamUser/ResolveVanityURL/v1/', { vanityurl: match[1] }, key);
    return data.response?.success === 1 ? data.response.steamid : null;
}
