// The signed-in user's Steam friends, for picking family members from a list
// instead of hunting down profile links.

import { friendList, isConfigured, json, readSession } from '../../lib/steam.js';

export async function onRequestGet({ request, env }) {
    if (!isConfigured(env)) return json({ error: 'not-configured' }, 503);

    const steamid = await readSession(request, env.SESSION_SECRET);
    if (!steamid) return json({ error: 'signed-out' }, 401);

    let friends;
    try {
        friends = await friendList(steamid, env.STEAM_API_KEY);
    } catch {
        return json({ error: 'steam-unavailable' }, 502);
    }

    if (!friends) return json({ private: true, friends: [] });
    return json({ private: false, friends });
}
