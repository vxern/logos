const languages = [
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
	"Swedish",
	"Turkish",
] as const;

type Language = typeof languages[number];

function isLanguage(language: string): language is Language {
	return (languages as readonly string[]).includes(language);
}

export { isLanguage };
export type { Language };
