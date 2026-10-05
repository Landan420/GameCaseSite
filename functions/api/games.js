// The signed-in user's owned games — the contents of their case.

import { isConfigured, json, ownedGames, readSession } from '../../lib/steam.js';

export async function onRequestGet({ request, env }) {
    if (!isConfigured(env)) return json({ error: 'not-configured' }, 503);

    const steamid = await readSession(request, env.SESSION_SECRET);
    if (!steamid) return json({ error: 'signed-out' }, 401);

    let games;
    try {
        games = await ownedGames(steamid, env.STEAM_API_KEY);
    } catch {
        return json({ error: 'steam-unavailable' }, 502);
    }

    if (!games) return json({ private: true, games: [] });
    return json({ private: false, games });
}
