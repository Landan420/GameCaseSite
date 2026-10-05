import { Gamepad2, Sparkles } from 'lucide-react';

import GameArt from './GameArt.jsx';
import { DEMO_GAMES } from '../lib/demo.js';
import { tierOf } from '../lib/rarity.js';

// Doubled so the CSS marquee can loop by sliding exactly half its width.
const MARQUEE = [...DEMO_GAMES, ...DEMO_GAMES];

export default function Landing({ configured, onDemo }) {
    return (
        <section className="landing">
            <div className="marquee" aria-hidden="true">
                <div className="marquee-track">
                    {MARQUEE.map((game, i) => (
                        <div className="reel-card" key={i} style={{ '--tier': tierOf(game).color }}>
                            <GameArt game={game} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="landing-copy">
                <h1>
                    Can't pick a game?
                    <span>Open your library like a case.</span>
                </h1>
                <p>
                    Sign in with Steam and every game you own goes into a case. Spin it, and whatever lands is
                    what you're playing tonight. No rerolls. (Okay, rerolls.)
                </p>

                <div className="landing-actions">
                    {configured ? (
                        <a className="btn btn-primary" href="/api/auth/login">
                            <Gamepad2 size={18} /> Sign in through Steam
                        </a>
                    ) : (
                        <span className="btn btn-disabled" title="STEAM_API_KEY and SESSION_SECRET aren't set">
                            <Gamepad2 size={18} /> Steam sign-in isn't set up yet
                        </span>
                    )}
                    <button className="btn" onClick={onDemo}>
                        <Sparkles size={18} /> Try a demo case
                    </button>
                </div>

                <p className="fine">
                    You sign in on steamcommunity.com, so this site never sees your password. It only reads your
                    game list, which needs your profile's <em>Game details</em> set to public.
                </p>
            </div>
        </section>
    );
}
