// A family member's library, looked up from a profile link.
//
// Steam Families has a Web API (IFamilyGroupsService), but it only accepts a
// signed-in user's own access token, never a developer key — so there's no way
// for a third-party site to read the family itself. Instead people add members
// by profile, and we read each member's owned games like we read their own.
//
// Signed-in only, so this can't be used as an open proxy for our API key.

import { isConfigured, json, ownedGames, playerSummary, readSession, resolveProfile } from '../../lib/steam.js';

export async function onRequestGet({ request, env }) {
    if (!isConfigured(env)) return json({ error: 'not-configured' }, 503);

    const me = await readSession(request, env.SESSION_SECRET);
    if (!me) return json({ error: 'signed-out' }, 401);

    const profile = new URL(request.url).searchParams.get('profile');

    try {
        const steamid = await resolveProfile(profile, env.STEAM_API_KEY);
        if (!steamid) return json({ error: 'not-found' }, 404);
        if (steamid === me) return json({ error: 'yourself' }, 400);

        const [player, games] = await Promise.all([
            playerSummary(steamid, env.STEAM_API_KEY),
            ownedGames(steamid, env.STEAM_API_KEY),
        ]);
        if (!player) return json({ error: 'not-found' }, 404);

        return json({
            steamid,
            name: player.personaname,
            avatar: player.avatarfull ?? null,
            private: !games,
            games: games ?? [],
        });
    } catch {
        return json({ error: 'steam-unavailable' }, 502);
    }
}
