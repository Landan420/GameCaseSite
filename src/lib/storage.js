// localStorage can throw (private windows, blocked site data), and nothing it
// holds here matters enough to break the page over.

const PREFIX = 'gamecase:';

export function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function saveJson(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        // Fine — it just won't be remembered next visit.
    }
}
