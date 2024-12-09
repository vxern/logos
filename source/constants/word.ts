const searchModes = [
	"word",
	"meaning",
	"relations",
	"pronunciation",
	"expressions",
	"examples",
	"inflection",
	"etymology",
] as const;
type WordSearchMode = (typeof searchModes)[number];

export default Object.freeze({ searchModes });
export type { WordSearchMode };
