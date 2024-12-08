const searchModes = ["word", "meaning", "expressions", "inflection", "etymology"] as const;
type WordSearchMode = (typeof searchModes)[number];

export default Object.freeze({ searchModes });
export type { WordSearchMode };
