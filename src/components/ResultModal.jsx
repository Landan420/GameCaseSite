import { useEffect, useRef } from 'react';
import { ExternalLink, Play, RotateCw, X } from 'lucide-react';

import GameArt from './GameArt.jsx';
import { describeGame, tierOf } from '../lib/rarity.js';

function lastPlayedText(unix) {
    if (!unix) return null;
    const date = new Date(unix * 1000);
    return `last played ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
}

export default function ResultModal({ game, groupSize, onClose, onRespin, onExclude }) {
    const playRef = useRef(null);
    const tier = tierOf(game);

    useEffect(() => {
        playRef.current?.focus();
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const details = [
        groupSize && `All ${groupSize} of you own this`,
        describeGame(game),
        lastPlayedText(game.lastPlayed),
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="result-title"
                style={{ '--tier': tier.color }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                <p className="modal-kicker">{tier.label}</p>
                <div className="modal-art-wrap">
                    <GameArt game={game} className="modal-art" />
                </div>
                <h2 id="result-title">{game.name}</h2>
                <p className="modal-sub">{details}</p>

                <div className="modal-actions">
                    <a ref={playRef} className="btn btn-primary" href={`steam://rungameid/${game.appid}`}>
                        <Play size={18} /> Play now
                    </a>
                    <button className="btn" onClick={onRespin}>
                        <RotateCw size={18} /> Spin again
                    </button>
                </div>

                <div className="modal-links">
                    <a href={`https://store.steampowered.com/app/${game.appid}`} target="_blank" rel="noreferrer">
                        Store page <ExternalLink size={13} />
                    </a>
                    <button onClick={onExclude}>Not tonight — take it out of the case</button>
                </div>
            </div>
        </div>
    );
}
