// Where Steam lands after sign-in. Confirms the assertion with Steam, then sets
// the session cookie and drops the browser back on the case page.

import {
    SESSION_TTL,
    createSession,
    isConfigured,
    originOf,
    sessionCookie,
    verifyLogin,
} from '../../../lib/steam.js';

export async function onRequestGet({ request, env }) {
    const origin = originOf(request);
    const fail = () => Response.redirect(`${origin}/?error=login`, 302);

    if (!isConfigured(env)) return fail();

    const steamid = await verifyLogin(new URL(request.url), origin).catch(() => null);
    if (!steamid) return fail();

    return new Response(null, {
        status: 302,
        headers: {
            location: `${origin}/`,
            'set-cookie': sessionCookie(origin, await createSession(steamid, env.SESSION_SECRET), SESSION_TTL),
        },
    });
}
