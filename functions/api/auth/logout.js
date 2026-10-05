// POST rather than GET so a stray <img src="/api/auth/logout"> elsewhere can't
// sign anyone out.

import { originOf, sessionCookie } from '../../../lib/steam.js';

export function onRequestPost({ request }) {
    return new Response(null, {
        status: 204,
        headers: { 'set-cookie': sessionCookie(originOf(request), '', 0) },
    });
}
