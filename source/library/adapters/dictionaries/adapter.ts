import dictionaries, {
	type DictionarySection,
	type DictionarySearchMode,
	getAllowedDictionarySections,
} from "logos:constants/dictionaries";
import type { LearningLanguage } from "logos:constants/languages/learning";
import type { DictionaryEntry } from "logos/adapters/dictionaries/dictionary-entry";
import type { Client } from "logos/client";
import type pino from "pino";

abstract class DictionaryAdapter<DataType = unknown> {
	readonly log: pino.Logger;
	readonly client: Client;
	readonly provides: DictionarySection[];
	readonly isFallback: boolean;

	constructor(
		client: Client,
		{
			identifier,
			provides,
			isFallback = false,
		}: { identifier: string; provides: DictionarySection[]; isFallback?: boolean },
	) {
		this.log = client.log.child({ name: identifier });
		this.client = client;
		this.provides = provides;
		this.isFallback = isFallback;
	}

	async getEntries(
		interaction: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
		{ searchMode }: { searchMode: DictionarySearchMode },
	): Promise<DictionaryEntry[] | undefined> {
		const data = await this.fetch(lemma, learningLanguage).catch((error) => {
			this.log.error(error, `Failed to get results for lemma '${lemma}' in ${learningLanguage}.`);
			return undefined;
		});
		if (data === undefined) {
			return undefined;
		}

		let rawEntries: DictionaryEntry[];
		try {
			rawEntries = this.parse(interaction, lemma, learningLanguage, data);
		} catch (error) {
			this.log.error(error, `Failed to format results for lemma '${lemma}' in ${learningLanguage}.`);
			return undefined;
		}

		if (rawEntries.length === 0) {
			return undefined;
		}

		const allowedSections = getAllowedDictionarySections(searchMode);

		const entries: DictionaryEntry[] = [];
		for (const rawEntry of rawEntries) {
			const rawSections = Object.entries(rawEntry);

			const baseSections: [string, unknown][] = [];
			const sections: [string, unknown][] = [];
			for (const rawSection of rawSections) {
				if (rawSection[1] === undefined) {
					continue;
				}

				if (dictionaries.baseSections.includes(rawSection[0])) {
					baseSections.push(rawSection);
					continue;
				}

				if (!allowedSections.includes(rawSection[0] as DictionarySection)) {
					continue;
				}

				if (Array.isArray(rawSection[1]) && rawSection[1].length === 0) {
					continue;
				}

				sections.push(rawSection);
			}

			if (sections.length === 0) {
				continue;
			}

			entries.push(Object.fromEntries([...baseSections, ...sections]) as unknown as DictionaryEntry);
		}

		return entries;
	}

	abstract fetch(lemma: string, learningLanguage: LearningLanguage): Promise<DataType | undefined>;

	abstract parse(
		interaction: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
		data: DataType,
	): DictionaryEntry[];
}

export { DictionaryAdapter };
