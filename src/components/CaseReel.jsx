import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { KeyRound } from 'lucide-react';

import GameArt from './GameArt.jsx';
import { tierOf } from '../lib/rarity.js';
import * as sound from '../lib/sound.js';

const REEL_LENGTH = 72;
const WIN_INDEX = 62;
const GAP = 8;
const DURATION = 7000;
// Quick launch, then a long crawl at the end, the way the CS2 reel slows down.
const EASING = 'cubic-bezier(0.06, 0.55, 0.1, 1)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function randomFrom(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

function fillReel(pool, winner) {
    if (!pool.length) return [];
    const items = Array.from({ length: REEL_LENGTH }, () => randomFrom(pool));
    if (winner) items[WIN_INDEX] = winner;
    return items;
}

export default function CaseReel({ ref, pool, mutedRef, onSpinStart, onWin }) {
    const viewportRef = useRef(null);
    const stripRef = useRef(null);
    const animRef = useRef(null);
    const spinningRef = useRef(false);

    const [items, setItems] = useState(() => fillReel(pool));
    const [plan, setPlan] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const [cardWidth, setCardWidth] = useState(196);

    useLayoutEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            setCardWidth(entry.contentRect.width < 640 ? 140 : 196);
        });
        observer.observe(viewportRef.current);
        return () => observer.disconnect();
    }, []);

    // Reshuffle the idle strip when the case contents change. Never mid-spin:
    // that would swap the cards out from under the animation.
    useEffect(() => {
        if (spinningRef.current) return;
        animRef.current?.cancel();
        setItems(fillReel(pool));
    }, [pool]);

    function spin() {
        if (spinningRef.current || !pool.length) return;
        sound.unlock();
        animRef.current?.cancel();

        const winner = randomFrom(pool);
        spinningRef.current = true;
        setSpinning(true);
        setItems(fillReel(pool, winner));
        // Where under the marker the winning card stops: anywhere from its
        // left edge to its right, so some spins end on a nail-biter.
        setPlan({ winner, jitter: Math.random() * 2 - 1 });
        onSpinStart?.();
    }

    useImperativeHandle(ref, () => ({ spin }));

    // Runs after the new strip is in the DOM, so the winner is really at WIN_INDEX.
    useLayoutEffect(() => {
        if (!plan) return;
        spinningRef.current = true;
        const strip = stripRef.current;
        const center = viewportRef.current.clientWidth / 2;
        const step = cardWidth + GAP;
        const target = center - (WIN_INDEX * step + cardWidth / 2) - plan.jitter * (cardWidth / 2 - 10);

        const anim = strip.animate(
            [{ transform: 'translateX(0px)' }, { transform: `translateX(${target}px)` }],
            { duration: reducedMotion() ? 1200 : DURATION, easing: EASING, fill: 'forwards' }
        );
        animRef.current = anim;

        // Click once for every card that crosses the marker.
        let lastIndex = null;
        let frame;
        const watch = () => {
            const x = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41;
            const index = Math.floor((center - x) / step);
            if (lastIndex !== null && index !== lastIndex && !mutedRef.current) sound.tick();
            lastIndex = index;
            frame = requestAnimationFrame(watch);
        };
        frame = requestAnimationFrame(watch);

        // `live` keeps a torn-down run (StrictMode's double effect, unmount)
        // from reporting a result for an animation that's been replaced.
        let live = true;
        let reveal;
        anim.finished
            .then(() => {
                if (!live) return;
                cancelAnimationFrame(frame);
                spinningRef.current = false;
                setSpinning(false);
                if (!mutedRef.current) sound.reveal();
                reveal = setTimeout(() => onWin(plan.winner), 450);
            })
            .catch(() => {
                // Cancelled by a reshuffle; the cleanup below handles teardown.
            });

        return () => {
            live = false;
            cancelAnimationFrame(frame);
            clearTimeout(reveal);
            if (anim.playState === 'running') anim.cancel();
        };
        // Only a new plan should start a spin; the rest is read once at launch.
    }, [plan]);

    return (
        <div className="reel-wrap">
            <div className="reel" ref={viewportRef} style={{ '--card-w': `${cardWidth}px`, '--gap': `${GAP}px` }}>
                <div className="reel-strip" ref={stripRef}>
                    {items.map((game, i) => (
                        <div className="reel-card" key={i} style={{ '--tier': tierOf(game).color }}>
                            <GameArt key={game.appid} game={game} />
                            <div className="reel-card-name">{game.name}</div>
                        </div>
                    ))}
                </div>
                <div className="reel-marker" aria-hidden="true" />
            </div>

            <button className="btn btn-open" onClick={spin} disabled={spinning || !pool.length}>
                <KeyRound size={18} />
                {spinning ? 'Opening…' : 'Open case'}
            </button>
        </div>
    );
}
