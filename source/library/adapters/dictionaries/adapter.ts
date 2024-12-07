import type { DictionarySection } from "logos:constants/dictionaries";
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
	): Promise<DictionaryEntry[] | undefined> {
		const data = await this.fetch(lemma, learningLanguage).catch((error) => {
			this.log.error(error, `Failed to get results for lemma '${lemma}' in ${learningLanguage}.`);
			return undefined;
		});
		if (data === undefined) {
			return undefined;
		}

		let entries: DictionaryEntry[];
		try {
			entries = this.parse(interaction, lemma, learningLanguage, data);
		} catch (error) {
			this.log.error(error, `Failed to format results for lemma '${lemma}' in ${learningLanguage}.`);
			return undefined;
		}

		if (entries.length === 0) {
			return undefined;
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
