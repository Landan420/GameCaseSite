import { useEffect, useState } from 'react';

import { loadJson, saveJson } from './storage.js';

export async function fetchMember(profile) {
    const res = await fetch(`/api/member?profile=${encodeURIComponent(profile)}`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'steam-unavailable');
    return { ...body, status: 'ready' };
}

// A saved list of other Steam users and their libraries — the family, or the
// group for a group spin. Only SteamIDs are stored; libraries are refetched on
// load so they stay current.
export function usePeople(user, key, { max, demoPeople = [] }) {
    const [people, setPeople] = useState([]);

    useEffect(() => {
        if (!user) return setPeople([]);
        if (user.demo) return setPeople(demoPeople);

        const saved = loadJson(`${key}:${user.steamid}`, []);
        setPeople(saved.map((steamid) => ({ steamid, status: 'loading', games: [] })));
        for (const steamid of saved) {
            fetchMember(steamid)
                .then((member) => setPeople((prev) => prev.map((m) => (m.steamid === steamid ? member : m))))
                .catch(() =>
                    setPeople((prev) => prev.map((m) => (m.steamid === steamid ? { ...m, status: 'error' } : m)))
                );
        }
        // demoPeople is a module constant; only the account and list matter.
    }, [user, key]);

    function save(list) {
        setPeople(list);
        if (!user.demo) saveJson(`${key}:${user.steamid}`, list.map((m) => m.steamid));
    }

    async function add(profile) {
        if (people.length >= max) throw new Error('full');
        const member = await fetchMember(profile);
        if (people.some((m) => m.steamid === member.steamid)) throw new Error('duplicate');
        save([...people, member]);
    }

    function remove(steamid) {
        save(people.filter((m) => m.steamid !== steamid));
    }

    return { people, add, remove };
}

// People whose libraries actually loaded and are readable.
export function readable(people) {
    return people.filter((m) => m.status === 'ready' && !m.private);
}
