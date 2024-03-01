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

type Language = (typeof languages)[number];

function isLanguage(language: string): language is Language {
	return (languages as readonly string[]).includes(language);
}

export { isLanguage };
export type { Language };
