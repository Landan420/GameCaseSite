# Game Case

Can't pick a game? Sign in with Steam, every game you own goes into a CS2-style
case, and you spin it. Whatever lands is what you're playing.

- Rarity colour comes from playtime. Untouched backlog games are the gold drop;
  your 2,000-hour main is Mil-Spec blue. Every game has the same odds; the colour
  is just for show.
- Filters (Everything / Never played / Under 2 hrs / Comfort picks) decide what
  goes in the case. Click a game in the contents grid, or hit "Not tonight" on
  a result, to take it out. Removed games are remembered per account in
  localStorage.
- "Try a demo case" works with no sign-in and no backend.
- **Family library:** add family members by profile link (`/api/member`), and
  any games they own that you don't go into the case as "Family Shared". Steam
  Families' own API (`IFamilyGroupsService`) only accepts a user's access token,
  not a developer key, so the family can't be read directly. Members' Game
  details must be public, and some games aren't shareable.
- **Group spin:** pick friends (from your Steam friends list, via
  `/api/friends`, or by profile link) and the case holds only games that you
  and every one of them own. People with private game lists can't be checked,
  so they're left out of the match and called out on the page.

## How sign-in works

```
browser ──► /api/auth/login ──► steamcommunity.com (user signs in there)
                                        │
browser ◄── cookie + redirect ◄── /api/auth/callback
                                        └─ POSTs the assertion back to Steam
                                           (check_authentication) to confirm it

browser ──► /api/me     ──► ISteamUser/GetPlayerSummaries     (name, avatar)
browser ──► /api/games  ──► IPlayerService/GetOwnedGames      (the case)
```

Steam has no OAuth, only OpenID 2.0, which proves who someone is and nothing
else. The library is read with our own Web API key, so it only works when the
user's profile has **Game details** set to Public; otherwise Steam returns an
empty list and the page shows how to fix it.

The session is a stateless signed cookie (`steamid.expiry.hmac`), so there's no
database.

## Setup

1. Get a Steam Web API key: https://steamcommunity.com/dev/apikey (the domain
   field can be `spinagame.pages.dev`).
2. Set the secrets on the Pages project:
   ```
   npx wrangler pages secret put STEAM_API_KEY --project-name spinagame
   npx wrangler pages secret put SESSION_SECRET --project-name spinagame
   ```
3. `npm run deploy`

## Local dev

- `npm run dev` — Vite on its own. Sign-in won't work (no Functions), but the
  demo case does.
- For real sign-in, copy `.dev.vars.example` to `.dev.vars`, fill it in, run
  `npm run dev:api` (wrangler on 8788) and `npm run dev` side by side, and use
  the Vite URL. Vite proxies `/api` to wrangler.

## Link previews

`social-src/card.html` is the source for the preview art. `npm run social`
renders it with the locally installed Chrome into `public/social/card.png`
(Open Graph / Twitter), `public/social/card.gif` (the spinning reel) and
`public/apple-touch-icon.png`.

Discord reads `public/social/discord-embed.json` through the
`<link rel="discord:component-embed">` tag in `index.html`: an animated
media gallery, a heading, and three link buttons. Everything else falls back to
the Open Graph tags. Discord caches previews per URL, so after changing them,
test with a URL it hasn't seen (e.g. `https://spinagame.pages.dev/?v=2`).
