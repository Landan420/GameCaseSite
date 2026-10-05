// Sends the browser to Steam's sign-in page. Steam bounces back to /callback.

import { loginUrl, originOf } from '../../../lib/steam.js';

export function onRequestGet({ request }) {
    return Response.redirect(loginUrl(originOf(request)), 302);
}
