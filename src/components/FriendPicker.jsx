import { useEffect, useState } from 'react';
import { Check, Loader2, Plus, Search } from 'lucide-react';

const PRIVACY_SETTINGS = 'https://steamcommunity.com/my/edit/settings';

export default function FriendPicker({ members, full, disabled, onAdd, errorText }) {
    const [state, setState] = useState({ status: 'loading' });
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        let live = true;
        fetch('/api/friends', { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
            .then((data) => {
                if (!live) return;
                setState(data.private ? { status: 'private' } : { status: 'ready', friends: data.friends });
            })
            .catch(() => live && setState({ status: 'error' }));
        return () => {
            live = false;
        };
    }, []);

    async function add(friend) {
        setBusy(friend.steamid);
        setErrors((e) => ({ ...e, [friend.steamid]: null }));
        try {
            await onAdd(friend.steamid);
        } catch (err) {
            setErrors((e) => ({ ...e, [friend.steamid]: errorText(err.message) }));
        } finally {
            setBusy(null);
        }
    }

    if (state.status === 'loading') {
        return (
            <div className="picker picker-msg">
                <Loader2 size={16} className="spin" /> Loading your friends…
            </div>
        );
    }

    if (state.status === 'private') {
        return (
            <div className="picker picker-msg">
                Your friends list is private, so Steam won't share it. Set <em>Friends List</em> to Public in your{' '}
                <a href={PRIVACY_SETTINGS} target="_blank" rel="noreferrer">
                    privacy settings
                </a>
                , or paste profile links below.
            </div>
        );
    }

    if (state.status === 'error') {
        return <div className="picker picker-msg">Couldn't load your friends from Steam. Try again in a minute.</div>;
    }

    const added = new Set(members.map((m) => m.steamid));
    const needle = query.trim().toLowerCase();
    const shown = needle ? state.friends.filter((f) => f.name.toLowerCase().includes(needle)) : state.friends;

    return (
        <div className="picker">
            <label className="search picker-search">
                <Search size={16} />
                <input
                    type="search"
                    placeholder={`Search ${state.friends.length.toLocaleString()} friends`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </label>

            <ul className="picker-list">
                {shown.map((friend) => {
                    const isAdded = added.has(friend.steamid);
                    return (
                        <li key={friend.steamid} className="picker-row">
                            {friend.avatar ? (
                                <img src={friend.avatar} alt="" />
                            ) : (
                                <span className="avatar-fallback">{friend.name.slice(0, 1)}</span>
                            )}
                            <span className="picker-name">
                                {friend.name}
                                {errors[friend.steamid] && <em>{errors[friend.steamid]}</em>}
                            </span>
                            {isAdded ? (
                                <span className="picker-added">
                                    <Check size={14} /> Added
                                </span>
                            ) : (
                                <button
                                    className="btn btn-small"
                                    onClick={() => add(friend)}
                                    disabled={disabled || full || busy !== null}
                                >
                                    {busy === friend.steamid ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                                    Add
                                </button>
                            )}
                        </li>
                    );
                })}
                {!shown.length && (
                    <li className="picker-empty">
                        {state.friends.length ? `No friends match “${query}”.` : 'Your friends list is empty.'}
                    </li>
                )}
            </ul>
        </div>
    );
}
