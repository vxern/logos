import { Locales } from 'discordeno';
import { getLanguageByLocale, Language } from 'logos/types.ts';

async function readStrings(directoryUri: string): Promise<Map<string, Map<Language, string>>> {
	const decoder = new TextDecoder();

	const stringsWithLocalisations = new Map<string, Map<Language, string>>();
	for await (const entry of Deno.readDir(directoryUri)) {
		if (!entry.isDirectory) continue;

		for await (const localeEntry of Deno.readDir(`${directoryUri}/${entry.name}`)) {
			if (!localeEntry.isFile) continue;

			const [locale, _] = localeEntry.name.split('.') as [Locales, string];
			const language = getLanguageByLocale(locale);
			if (language === undefined) continue;

			const strings = await Deno.readFile(`${directoryUri}/${entry.name}/${localeEntry.name}`)
				.then((contents) => decoder.decode(contents))
				.then((object) => JSON.parse(object) as Record<string, string>);

			for (const [key, value] of Object.entries(strings)) {
				if (!stringsWithLocalisations.has(key)) {
					stringsWithLocalisations.set(key, new Map());
				}
				stringsWithLocalisations.get(key)!.set(language, value);
			}
		}
	}

	return stringsWithLocalisations;
}

readStrings('./assets/localisations/');
