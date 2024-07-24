const languages = Object.freeze([
	"Armenian",
	"Danish",
	"Dutch",
	"English",
	"French",
	"German",
	"Greek",
	"Hungarian",
	"Norwegian",
	"Polish",
	"Romanian",
	"Russian",
	"Spanish",
	"Swedish",
	"Turkish",
] as const);
type FeatureLanguage = (typeof languages)[number];

function isFeatureLanguage(language: string): language is FeatureLanguage {
	return (languages as readonly string[]).includes(language);
}

export { isFeatureLanguage };
export type { FeatureLanguage };
