// A made-up library for trying the case without signing in. App IDs are real
// so the Steam CDN art loads; the playtimes are invented (minutes).

export const DEMO_USER = {
    steamid: 'demo',
    name: 'Demo',
    avatar: null,
    profileUrl: null,
    demo: true,
};

export const DEMO_GAMES = [
    { appid: 730, name: 'Counter-Strike 2', playtime: 184200 },
    { appid: 570, name: 'Dota 2', playtime: 3100 },
    { appid: 1172470, name: 'Apex Legends', playtime: 2620 },
    { appid: 271590, name: 'Grand Theft Auto V', playtime: 9400 },
    { appid: 1091500, name: 'Cyberpunk 2077', playtime: 410 },
    { appid: 1245620, name: 'ELDEN RING', playtime: 0 },
    { appid: 413150, name: 'Stardew Valley', playtime: 3900 },
    { appid: 105600, name: 'Terraria', playtime: 7220 },
    { appid: 892970, name: 'Valheim', playtime: 1380 },
    { appid: 252490, name: 'Rust', playtime: 22 },
    { appid: 1086940, name: "Baldur's Gate 3", playtime: 0 },
    { appid: 367520, name: 'Hollow Knight', playtime: 95 },
    { appid: 1145360, name: 'Hades', playtime: 640 },
    { appid: 620, name: 'Portal 2', playtime: 820 },
    { appid: 400, name: 'Portal', playtime: 230 },
    { appid: 220, name: 'Half-Life 2', playtime: 0 },
    { appid: 546560, name: 'Half-Life: Alyx', playtime: 0 },
    { appid: 1174180, name: 'Red Dead Redemption 2', playtime: 45 },
    { appid: 292030, name: 'The Witcher 3: Wild Hunt', playtime: 0 },
    { appid: 588650, name: 'Dead Cells', playtime: 310 },
    { appid: 646570, name: 'Slay the Spire', playtime: 1720 },
    { appid: 1794680, name: 'Vampire Survivors', playtime: 560 },
    { appid: 945360, name: 'Among Us', playtime: 180 },
    { appid: 739630, name: 'Phasmophobia', playtime: 760 },
    { appid: 1966720, name: 'Lethal Company', playtime: 1540 },
    { appid: 553850, name: 'HELLDIVERS 2', playtime: 12 },
    { appid: 1172620, name: 'Sea of Thieves', playtime: 0 },
    { appid: 268910, name: 'Cuphead', playtime: 38 },
    { appid: 504230, name: 'Celeste', playtime: 0 },
    { appid: 381210, name: 'Dead by Daylight', playtime: 260 },
];

// A pretend family member, so the family library can be tried in the demo.
export const DEMO_MEMBER = {
    steamid: 'demo-member',
    name: 'Demo Sibling',
    avatar: null,
    private: false,
    status: 'ready',
    games: [
        { appid: 1145360, name: 'Hades', playtime: 900 },
        { appid: 1888930, name: 'The Last of Us Part I', playtime: 600 },
        { appid: 990080, name: 'Hogwarts Legacy', playtime: 2400 },
        { appid: 1593500, name: 'God of War', playtime: 1300 },
        { appid: 1817070, name: "Marvel's Spider-Man Remastered", playtime: 700 },
        { appid: 2050650, name: 'Resident Evil 4', playtime: 480 },
        { appid: 1462040, name: 'FINAL FANTASY VII REMAKE INTERGRADE', playtime: 0 },
    ],
};

// Two pretend friends for the group spin. Their libraries overlap with the
// demo library on only a handful of games, so the intersection is visible.
export const DEMO_SQUAD = [
    {
        steamid: 'demo-friend-1',
        name: 'Demo Friend',
        avatar: null,
        private: false,
        status: 'ready',
        games: [730, 570, 105600, 892970, 252490, 620, 945360, 739630, 1966720, 553850, 381210, 413150].map(
            (appid) => ({ appid, name: '', playtime: 0 })
        ),
    },
    {
        steamid: 'demo-friend-2',
        name: 'Another Friend',
        avatar: null,
        private: false,
        status: 'ready',
        games: [730, 105600, 892970, 620, 945360, 739630, 1966720, 553850, 1086940, 1245620].map((appid) => ({
            appid,
            name: '',
            playtime: 0,
        })),
    },
];
