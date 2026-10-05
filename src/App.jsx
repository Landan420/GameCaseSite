import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Package, User, Users, UsersRound, Volume2, VolumeX } from 'lucide-react';

import Landing from './components/Landing.jsx';
import CaseReel from './components/CaseReel.jsx';
import Contents from './components/Contents.jsx';
import ResultModal from './components/ResultModal.jsx';
import PeoplePanel from './components/PeoplePanel.jsx';
import { DEMO_GAMES, DEMO_MEMBER, DEMO_SQUAD, DEMO_USER } from './lib/demo.js';
import { FILTERS } from './lib/rarity.js';
import { loadJson, saveJson } from './lib/storage.js';
import { readable, usePeople } from './lib/usePeople.js';

const PRIVACY_SETTINGS = 'https://steamcommunity.com/my/edit/settings';
// Read once at load: the effect below tidies the URL, and StrictMode runs it
// twice in dev, so a second read would find the parameters already gone.
const INITIAL_PARAMS = new URLSearchParams(window.location.search);
const DEMO_FAMILY = [DEMO_MEMBER];
const MAX_FAMILY = 5; // a Steam Family is you plus up to five others
const MAX_GROUP = 9; // ten people total is already more than one lobby

// Your games plus anything a family member owns that you don't. A game owned
// by several members lists all of them.
function mergeFamily(games, members) {
    const owned = new Set(games.map((g) => g.appid));
    const shared = new Map();
    for (const member of readable(members)) {
        for (const g of member.games) {
            if (owned.has(g.appid)) continue;
            const entry = shared.get(g.appid);
            if (entry) entry.sharedBy.push(member.name);
            else shared.set(g.appid, { appid: g.appid, name: g.name, icon: g.icon, playtime: null, sharedBy: [member.name] });
        }
    }
    return [...shared.values()];
}

// Only your games that every readable group member also owns. Private
// libraries can't be checked, so those people are left out (and flagged).
function intersectGroup(games, group) {
    const libraries = readable(group).map((m) => new Set(m.games.map((g) => g.appid)));
    if (!libraries.length) return [];
    return games.filter((g) => libraries.every((owned) => owned.has(g.appid)));
}

export default function App() {
    const [status, setStatus] = useState('loading'); // loading | signed-out | ready
    const [configured, setConfigured] = useState(true);
    const [user, setUser] = useState(null);
    const [games, setGames] = useState([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [notice, setNotice] = useState(null);

    const [mode, setMode] = useState('solo'); // solo | group
    const [familyOn, setFamilyOn] = useState(true);
    const family = usePeople(user, 'family', { max: MAX_FAMILY, demoPeople: DEMO_FAMILY });
    const group = usePeople(user, 'group', { max: MAX_GROUP, demoPeople: DEMO_SQUAD });

    const [filter, setFilter] = useState('all');
    const [excluded, setExcluded] = useState(() => new Set());
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(null);

    const [muted, setMuted] = useState(() => loadJson('muted', false));
    // The reel reads this mid-spin, so toggling mute takes effect on the next click.
    const mutedRef = useRef(muted);
    mutedRef.current = muted;

    const reelRef = useRef(null);

    useEffect(() => {
        const params = INITIAL_PARAMS;
        if (params.get('error') === 'login') {
            setNotice("Steam sign-in didn't go through. Give it another try.");
        }
        // ?demo — the "Try the demo" button on the Discord embed.
        const wantsDemo = params.has('demo');
        if (window.location.search) window.history.replaceState(null, '', '/');

        (async () => {
            try {
                const meRes = await fetch('/api/me', { cache: 'no-store' });
                if (meRes.status === 503) setConfigured(false);
                if (!meRes.ok) return wantsDemo ? startDemo() : setStatus('signed-out');

                const gamesRes = await fetch('/api/games', { cache: 'no-store' });
                if (!gamesRes.ok) throw new Error(`games ${gamesRes.status}`);
                const library = await gamesRes.json();

                setUser(await meRes.json());
                setGames(library.games);
                setIsPrivate(library.private);
                setStatus('ready');
            } catch {
                setNotice("Couldn't reach Steam just now. Try refreshing in a minute.");
                setStatus('signed-out');
            }
        })();
    }, []);

    // Removed games and settings are remembered per account.
    useEffect(() => {
        if (!user) return;
        setExcluded(new Set(loadJson(`excluded:${user.steamid}`, [])));
        setFamilyOn(loadJson(`family-on:${user.steamid}`, true));
        setMode(loadJson(`mode:${user.steamid}`, 'solo'));
    }, [user]);

    function toggleFamily(on) {
        setFamilyOn(on);
        saveJson(`family-on:${user.steamid}`, on);
    }

    function switchMode(next) {
        setMode(next);
        setResult(null);
        saveJson(`mode:${user.steamid}`, next);
    }

    const toggleExcluded = useCallback(
        (appid) => {
            setExcluded((prev) => {
                const next = new Set(prev);
                if (!next.delete(appid)) next.add(appid);
                saveJson(`excluded:${user.steamid}`, [...next]);
                return next;
            });
        },
        [user]
    );

    const sharedGames = useMemo(() => mergeFamily(games, family.people), [games, family.people]);
    const groupGames = useMemo(() => intersectGroup(games, group.people), [games, group.people]);
    const groupReady = readable(group.people);

    const allGames = useMemo(() => {
        if (mode === 'group') return groupGames;
        return familyOn && sharedGames.length ? [...games, ...sharedGames] : games;
    }, [mode, groupGames, games, sharedGames, familyOn]);
    const hasFamily = mode === 'solo' && allGames.length > games.length;

    // Leaving family mode while "Family only" is picked would leave an empty case.
    const activeFilter = !hasFamily && filter === 'family' ? 'all' : filter;

    const filtered = useMemo(() => {
        const { test } = FILTERS.find((f) => f.id === activeFilter);
        return allGames.filter(test);
    }, [allGames, activeFilter]);

    const pool = useMemo(() => filtered.filter((g) => !excluded.has(g.appid)), [filtered, excluded]);

    const counts = useMemo(
        () =>
            Object.fromEntries(FILTERS.map((f) => [f.id, allGames.filter((g) => f.test(g) && !excluded.has(g.appid)).length])),
        [allGames, excluded]
    );

    const ownedSet = useMemo(() => new Set(games.map((g) => g.appid)), [games]);
    const describeGroupMember = useCallback(
        (m) => `${m.games.filter((g) => ownedSet.has(g.appid)).length.toLocaleString()} games in common with you`,
        [ownedSet]
    );

    function startDemo() {
        setNotice(null);
        setUser(DEMO_USER);
        setGames(DEMO_GAMES);
        setIsPrivate(false);
        setStatus('ready');
    }

    async function signOut() {
        if (!user?.demo) await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        setUser(null);
        setGames([]);
        setResult(null);
        setFilter('all');
        setMode('solo');
        setStatus('signed-out');
    }

    function toggleMute() {
        setMuted((m) => {
            saveJson('muted', !m);
            return !m;
        });
    }

    const handleWin = useCallback((game) => {
        setSpinning(false);
        setResult(game);
    }, []);

    const closeResult = useCallback(() => setResult(null), []);

    const groupSize = groupReady.length + 1;
    const leftOut = group.people.filter((m) => m.status !== 'loading' && !groupReady.includes(m));

    let caseTitle;
    let caseSub;
    if (mode === 'group') {
        caseTitle = 'Group Case';
        caseSub = groupReady.length
            ? `${pool.length.toLocaleString()} of ${allGames.length.toLocaleString()} games all ${groupSize} of you own`
            : 'Add friends to find games you all own';
    } else {
        caseTitle = user?.demo ? 'Demo Case' : `${user?.name}'s Library Case`;
        caseSub = `${pool.length.toLocaleString()} of ${allGames.length.toLocaleString()} games in the case`;
    }

    let emptyState = null;
    if (mode === 'group' && !groupReady.length) {
        emptyState = {
            title: 'Who are you playing with?',
            text: 'Add friends below. The case fills with games every one of you owns.',
        };
    } else if (mode === 'group' && !groupGames.length) {
        emptyState = {
            title: 'Nothing everyone owns',
            text: "There's no game all of you have. Try taking someone out of the group.",
        };
    } else if (!pool.length) {
        emptyState = {
            title: 'The case is empty',
            text: 'Pick a different filter, or put some games back from the list below.',
        };
    }

    return (
        <div className="app">
            <header className="topbar">
                <div className="brand">
                    <Package size={22} />
                    <span>
                        GAME<b>CASE</b>
                    </span>
                </div>

                {status === 'ready' && (
                    <div className="topbar-right">
                        <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <UserChip user={user} />
                        <button className="icon-btn" onClick={signOut} aria-label={user.demo ? 'Leave demo' : 'Sign out'}>
                            <LogOut size={18} />
                        </button>
                    </div>
                )}
            </header>

            {notice && (
                <div className="notice" role="status">
                    {notice}
                    <button onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
                </div>
            )}

            {status === 'loading' && <div className="loading">Loading your library…</div>}

            {status === 'signed-out' && <Landing configured={configured} onDemo={startDemo} />}

            {status === 'ready' && (
                <main className="case-page">
                    {!isPrivate && (
                        <div className="modes" role="tablist" aria-label="Case type">
                            <button
                                role="tab"
                                aria-selected={mode === 'solo'}
                                className={`mode${mode === 'solo' ? ' mode-on' : ''}`}
                                onClick={() => switchMode('solo')}
                                disabled={spinning}
                            >
                                <User size={16} /> My library
                            </button>
                            <button
                                role="tab"
                                aria-selected={mode === 'group'}
                                className={`mode${mode === 'group' ? ' mode-on' : ''}`}
                                onClick={() => switchMode('group')}
                                disabled={spinning}
                            >
                                <UsersRound size={16} /> Group spin
                                {groupReady.length > 0 && <span className="mode-count">{groupSize}</span>}
                            </button>
                        </div>
                    )}

                    <div className="case-head">
                        <h1>{caseTitle}</h1>
                        <p>{caseSub}</p>
                    </div>

                    {isPrivate ? (
                        <div className="empty">
                            <h2>Your game list is private</h2>
                            <p>
                                Steam only shares owned games when <em>Game details</em> is set to Public. Change it
                                in your{' '}
                                <a href={PRIVACY_SETTINGS} target="_blank" rel="noreferrer">
                                    privacy settings
                                </a>
                                , then refresh this page.
                            </p>
                        </div>
                    ) : (
                        <>
                            {emptyState ? (
                                <div className="empty">
                                    <h2>{emptyState.title}</h2>
                                    <p>{emptyState.text}</p>
                                </div>
                            ) : (
                                <CaseReel
                                    ref={reelRef}
                                    pool={pool}
                                    mutedRef={mutedRef}
                                    onSpinStart={() => setSpinning(true)}
                                    onWin={handleWin}
                                />
                            )}

                            {allGames.length > 0 && (
                                <div className="filters" role="group" aria-label="What goes in the case">
                                    {FILTERS.filter((f) => !f.familyOnly || hasFamily).map((f) => (
                                        <button
                                            key={f.id}
                                            className={`chip${activeFilter === f.id ? ' chip-on' : ''}`}
                                            onClick={() => setFilter(f.id)}
                                            disabled={spinning}
                                            aria-pressed={activeFilter === f.id}
                                        >
                                            {f.label} <span>{counts[f.id]}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {mode === 'group' ? (
                                <PeoplePanel
                                    className="group-panel"
                                    title="Your group"
                                    icon={UsersRound}
                                    hint={
                                        <>
                                            Only games that you and everyone here own go in the case.
                                            {leftOut.length > 0 && (
                                                <strong className="left-out">
                                                    {' '}
                                                    Left out because their game list is private or didn't load:{' '}
                                                    {leftOut.map((m) => m.name || 'someone').join(', ')}.
                                                </strong>
                                            )}
                                        </>
                                    }
                                    people={group.people}
                                    max={MAX_GROUP}
                                    fullText={`That's a full group — up to ${MAX_GROUP + 1} people including you.`}
                                    listName="group"
                                    describe={describeGroupMember}
                                    onAdd={group.add}
                                    onRemove={group.remove}
                                    disabled={spinning}
                                    demo={Boolean(user.demo)}
                                    demoText="Sign in with Steam to spin with your real friends."
                                />
                            ) : (
                                <PeoplePanel
                                    title="Family library"
                                    icon={Users}
                                    headerExtra={
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={familyOn}
                                                onChange={(e) => toggleFamily(e.target.checked)}
                                                disabled={spinning || !family.people.length}
                                            />
                                            <span className="switch-track" aria-hidden="true" />
                                            Put {sharedGames.length.toLocaleString()} shared{' '}
                                            {sharedGames.length === 1 ? 'game' : 'games'} in the case
                                        </label>
                                    }
                                    hint={
                                        <>
                                            Steam doesn't let other sites read your Steam Family, so pick members from
                                            your friends or paste a profile link. Their <em>Game details</em> need to
                                            be public. Some games can't be family shared, so now and then a pick might
                                            not be playable.
                                        </>
                                    }
                                    people={family.people}
                                    max={MAX_FAMILY}
                                    fullText={`A Steam Family only has room for ${MAX_FAMILY} other people.`}
                                    listName="family list"
                                    onAdd={family.add}
                                    onRemove={family.remove}
                                    disabled={spinning}
                                    demo={Boolean(user.demo)}
                                    demoText="Sign in with Steam to add your real family members."
                                />
                            )}

                            {allGames.length > 0 && (
                                <Contents
                                    games={filtered}
                                    excluded={excluded}
                                    hasFamily={hasFamily}
                                    onToggle={toggleExcluded}
                                    disabled={spinning}
                                />
                            )}
                        </>
                    )}
                </main>
            )}

            <footer className="footer">
                Not affiliated with Valve. Game data from the Steam Web API.
            </footer>

            {result && (
                <ResultModal
                    game={result}
                    groupSize={mode === 'group' ? groupSize : null}
                    onClose={closeResult}
                    onRespin={() => {
                        setResult(null);
                        reelRef.current?.spin();
                    }}
                    onExclude={() => {
                        toggleExcluded(result.appid);
                        setResult(null);
                    }}
                />
            )}
        </div>
    );
}

function UserChip({ user }) {
    const avatar = user.avatar ? (
        <img src={user.avatar} alt="" />
    ) : (
        <span className="avatar-fallback">{user.name.slice(0, 1)}</span>
    );

    if (!user.profileUrl) {
        return (
            <span className="user">
                {avatar}
                <span>{user.name}</span>
            </span>
        );
    }

    return (
        <a className="user" href={user.profileUrl} target="_blank" rel="noreferrer">
            {avatar}
            <span>{user.name}</span>
        </a>
    );
}
