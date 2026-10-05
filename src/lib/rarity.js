// CS2 rarity colours, assigned by playtime. The less you've played something,
// the rarer the drop — an untouched game in your backlog is the gold knife.
// Every game still has the same chance of landing; this is just the colour.

export const TIERS = [
    { id: 'gold', label: '★ Untouched', blurb: 'Never launched', color: '#e4ae39', max: 0 },
    { id: 'covert', label: 'Covert', blurb: 'Under an hour', color: '#eb4b4b', max: 59 },
    { id: 'classified', label: 'Classified', blurb: '1–10 hours', color: '#d32ce6', max: 599 },
    { id: 'restricted', label: 'Restricted', blurb: '10–50 hours', color: '#8847ff', max: 2999 },
    { id: 'milspec', label: 'Mil-Spec', blurb: '50+ hours', color: '#4b69ff', max: Infinity },
];

// Borrowed games have no playtime for *you* — Steam only reports the owner's —
// so they get their own grade (CS2's Consumer grey) instead of a guess.
export const FAMILY_TIER = { id: 'family', label: 'Family Shared', blurb: 'From a family library', color: '#b0c3d9' };

export function tierOf(game) {
    if (game.sharedBy) return FAMILY_TIER;
    return TIERS.find((t) => game.playtime <= t.max);
}

// Higher is rarer; family games sort below Mil-Spec.
export function tierRank(game) {
    return game.sharedBy ? TIERS.length : TIERS.indexOf(tierOf(game));
}

export function formatPlaytime(minutes) {
    if (!minutes) return 'Never played';
    if (minutes < 60) return `${minutes} min played`;
    const hours = minutes / 60;
    return `${hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString()} hrs played`;
}

export function describeGame(game) {
    return game.sharedBy ? `Shared by ${game.sharedBy.join(', ')}` : formatPlaytime(game.playtime);
}

const own = (g) => !g.sharedBy;

export const FILTERS = [
    { id: 'all', label: 'Everything', test: () => true },
    { id: 'unplayed', label: 'Never played', test: (g) => own(g) && g.playtime === 0 },
    { id: 'backlog', label: 'Under 2 hrs', test: (g) => own(g) && g.playtime < 120 },
    { id: 'comfort', label: 'Comfort picks', test: (g) => own(g) && g.playtime >= 600 },
    { id: 'family', label: 'Family only', test: (g) => !own(g), familyOnly: true },
];
