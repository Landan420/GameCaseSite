import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import GameArt from './GameArt.jsx';
import { FAMILY_TIER, TIERS, describeGame, tierOf, tierRank } from '../lib/rarity.js';

// "Contains one of the following items" — the case's full contents, lowest
// rarity first like in CS2. Clicking a game takes it out of (or back into) the case.
export default function Contents({ games, excluded, hasFamily, onToggle, disabled }) {
    const [query, setQuery] = useState('');

    const sorted = useMemo(
        () => [...games].sort((a, b) => tierRank(b) - tierRank(a) || a.name.localeCompare(b.name)),
        [games]
    );

    const needle = query.trim().toLowerCase();
    const shown = needle ? sorted.filter((g) => g.name.toLowerCase().includes(needle)) : sorted;

    return (
        <section className="contents">
            <div className="contents-head">
                <div>
                    <h2>Contains one of the following</h2>
                    <p className="legend">
                        {(hasFamily ? [...TIERS, FAMILY_TIER] : TIERS).map((t) => (
                            <span key={t.id} style={{ '--tier': t.color }}>
                                {t.label} <em>{t.blurb}</em>
                            </span>
                        ))}
                    </p>
                </div>
                <label className="search">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Find a game"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
            </div>

            <p className="contents-hint">Click a game to take it out of the case. Click again to put it back.</p>

            <div className="contents-grid">
                {shown.map((game) => {
                    const out = excluded.has(game.appid);
                    return (
                        <button
                            key={game.appid}
                            className={`tile${out ? ' tile-out' : ''}`}
                            style={{ '--tier': tierOf(game).color }}
                            onClick={() => onToggle(game.appid)}
                            disabled={disabled}
                            aria-pressed={!out}
                            title={out ? 'Put back in the case' : 'Take out of the case'}
                        >
                            <GameArt game={game} lazy />
                            <span className="tile-name">{game.name}</span>
                            <span className="tile-meta">{out ? 'Removed' : describeGame(game)}</span>
                        </button>
                    );
                })}
                {!shown.length && <p className="contents-empty">No games match “{query}”.</p>}
            </div>
        </section>
    );
}
