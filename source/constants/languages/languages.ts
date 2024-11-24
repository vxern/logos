import type { Language } from "logos:constants/languages";

function sortLanguages<T extends Language>(languages: T[]) {
	return languages.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function collectLanguages<T extends Language>(languagesByPlatform: Record<string, readonly T[]>): T[] {
	const languages = Object.entries(languagesByPlatform).reduce<T[]>((result, [_, languages]) => {
		result.push(...languages);

		return result;
	}, []);

	return [...new Set<T>(languages)];
}

export { sortLanguages, collectLanguages };
