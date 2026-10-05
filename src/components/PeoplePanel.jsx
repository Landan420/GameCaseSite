import { useState } from 'react';
import { Loader2, Plus, UserPlus, X } from 'lucide-react';

import FriendPicker from './FriendPicker.jsx';

const BASE_ERRORS = {
    'not-found': "Couldn't find that Steam profile.",
    yourself: "That's you — your own games are already counted.",
    'signed-out': 'Your sign-in expired. Refresh the page and sign in again.',
};

function defaultStatus(member) {
    return `${member.games.length.toLocaleString()} games`;
}

// A list of Steam users with a friend picker and a paste-a-profile box. Used
// for both the family library and the group spin; the parent decides what
// their libraries mean.
export default function PeoplePanel({
    title,
    icon: Icon,
    headerExtra,
    hint,
    people,
    max,
    fullText,
    listName,
    describe = defaultStatus,
    onAdd,
    onRemove,
    disabled,
    demo,
    demoText,
    className = '',
}) {
    const [profile, setProfile] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState(null);
    const [picking, setPicking] = useState(false);

    const errors = { ...BASE_ERRORS, duplicate: `They're already in your ${listName}.`, full: fullText };
    const errorText = (code) => errors[code] ?? "Steam didn't answer. Try again in a minute.";

    function memberStatus(member) {
        if (member.status === 'loading') return 'Loading…';
        if (member.status === 'error') return "Couldn't load";
        if (member.private) return 'Game list is private';
        return describe(member);
    }

    async function submit(e) {
        e.preventDefault();
        if (!profile.trim() || adding) return;
        setAdding(true);
        setError(null);
        try {
            await onAdd(profile.trim());
            setProfile('');
        } catch (err) {
            setError(errorText(err.message));
        } finally {
            setAdding(false);
        }
    }

    return (
        <section className={`family ${className}`}>
            <div className="family-head">
                <h2>
                    <Icon size={20} /> {title}
                </h2>
                {headerExtra}
            </div>

            <p className="family-hint">{hint}</p>

            {people.length > 0 && (
                <ul className="members">
                    {people.map((m) => (
                        <li key={m.steamid} className={`member${m.private || m.status === 'error' ? ' member-warn' : ''}`}>
                            {m.avatar ? (
                                <img src={m.avatar} alt="" />
                            ) : (
                                <span className="avatar-fallback">{(m.name || '?').slice(0, 1)}</span>
                            )}
                            <span className="member-text">
                                <strong>{m.name || 'Loading…'}</strong>
                                <span>
                                    {m.status === 'loading' && <Loader2 size={12} className="spin" />}
                                    {memberStatus(m)}
                                </span>
                            </span>
                            <button
                                className="member-remove"
                                onClick={() => onRemove(m.steamid)}
                                disabled={disabled}
                                aria-label={`Remove ${m.name || 'member'}`}
                            >
                                <X size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {demo ? (
                <p className="family-hint">{demoText}</p>
            ) : (
                <>
                    <button
                        className={`btn btn-small picker-toggle${picking ? ' picker-toggle-on' : ''}`}
                        onClick={() => setPicking((p) => !p)}
                        aria-expanded={picking}
                    >
                        <UserPlus size={16} /> {picking ? 'Hide friends list' : 'Pick from your friends'}
                    </button>
                    {picking && (
                        <FriendPicker
                            members={people}
                            full={people.length >= max}
                            disabled={disabled}
                            onAdd={onAdd}
                            errorText={errorText}
                        />
                    )}

                    {people.length < max ? (
                        <form className="member-form" onSubmit={submit}>
                            <input
                                type="text"
                                value={profile}
                                onChange={(e) => setProfile(e.target.value)}
                                placeholder="Paste a Steam profile link or custom URL"
                                aria-label={`Add to your ${listName} by Steam profile`}
                                disabled={disabled}
                            />
                            <button className="btn" type="submit" disabled={disabled || adding || !profile.trim()}>
                                {adding ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                                Add
                            </button>
                        </form>
                    ) : (
                        <p className="family-hint">{fullText}</p>
                    )}
                </>
            )}
            {error && <p className="member-error">{error}</p>}
        </section>
    );
}
