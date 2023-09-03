import { TranslationLanguage } from "../../../../constants/languages";
import { TranslationAdapter, TranslationLanguages } from "./adapter";
import deepl from "./adapters/deepl";

const adaptersLocalised: Record<TranslationLanguage, TranslationAdapter[]> = {
	Bulgarian: [deepl],
	Czech: [deepl],
	Danish: [deepl],
	German: [deepl],
	Greek: [deepl],
	"English/British": [deepl],
	"English/American": [deepl],
	Spanish: [deepl],
	Estonian: [deepl],
	Finnish: [deepl],
	French: [deepl],
	Hungarian: [deepl],
	Indonesian: [deepl],
	Italian: [deepl],
	Japanese: [deepl],
	Korean: [deepl],
	Lithuanian: [deepl],
	Latvian: [deepl],
	Norwegian: [deepl],
	Dutch: [deepl],
	Polish: [deepl],
	"Portuguese/Brazilian": [deepl],
	"Portuguese/European": [deepl],
	Romanian: [deepl],
	Russian: [deepl],
	Slovak: [deepl],
	Slovenian: [deepl],
	Swedish: [deepl],
	Turkish: [deepl],
	Ukrainian: [deepl],
	"Chinese/Simplified": [deepl],
};

function resolveAdapters(languages: TranslationLanguages): TranslationAdapter[] | undefined {
	const sourceAdapters = adaptersLocalised[languages.source];
	const targetAdapters = adaptersLocalised[languages.target];

	const sourceIdentifiers = sourceAdapters.map((adapter) => adapter.identifier);

	const sharedAdapters = targetAdapters.filter((targetAdapter) => sourceIdentifiers.includes(targetAdapter.identifier));
	if (sharedAdapters.length === 0) {
		return undefined;
	}

	return sharedAdapters;
}

export { resolveAdapters };
