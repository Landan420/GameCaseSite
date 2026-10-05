import { useState } from 'react';

// Steam moved store art to a new path in 2024; older apps still answer on the
// old one. Try both, then fall back to the tiny library icon and the name.
const SOURCES = [
    (id) => `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`,
    (id) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
];

// Give this a key of the appid wherever the game can change in place, so a
// failed attempt on one game doesn't carry over to the next.
export default function GameArt({ game, className = '', lazy = false }) {
    const [attempt, setAttempt] = useState(0);

    if (attempt >= SOURCES.length) {
        return (
            <div className={`art art-fallback ${className}`}>
                {game.icon && <img src={game.icon} alt="" />}
                <span>{game.name}</span>
            </div>
        );
    }

    return (
        <img
            className={`art ${className}`}
            src={SOURCES[attempt](game.appid)}
            alt={game.name}
            loading={lazy ? 'lazy' : 'eager'}
            draggable={false}
            onError={() => setAttempt((a) => a + 1)}
        />
    );
}
