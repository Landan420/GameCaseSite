// Who's signed in: name and avatar for the header.

import { isConfigured, json, playerSummary, readSession } from '../../lib/steam.js';

export async function onRequestGet({ request, env }) {
    if (!isConfigured(env)) return json({ error: 'not-configured' }, 503);

    const steamid = await readSession(request, env.SESSION_SECRET);
    if (!steamid) return json({ error: 'signed-out' }, 401);

    let player;
    try {
        player = await playerSummary(steamid, env.STEAM_API_KEY);
    } catch {
        // The name is cosmetic — don't lock someone out over it.
    }

    return json({
        steamid,
        name: player?.personaname ?? 'Steam user',
        avatar: player?.avatarfull ?? null,
        profileUrl: player?.profileurl ?? `https://steamcommunity.com/profiles/${steamid}`,
    });
}
