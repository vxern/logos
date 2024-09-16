import type { DictionarySection } from "logos:constants/dictionaries";
import type { LearningLanguage } from "logos:constants/languages/learning";
import type { DictionaryEntry } from "logos/adapters/dictionaries/dictionary-entry";
import type { Client } from "logos/client";
import type pino from "pino";

abstract class DictionaryAdapter<DataType = unknown> {
	readonly log: pino.Logger;
	readonly client: Client;
	readonly provides: DictionarySection[];
	readonly supports: LearningLanguage[];
	readonly isFallback: boolean;

	constructor(
		client: Client,
		{
			identifier,
			provides,
			supports,
			isFallback = false,
		}: { identifier: string; provides: DictionarySection[]; supports: LearningLanguage[]; isFallback?: boolean },
	) {
		this.log = client.log.child({ name: identifier });
		this.client = client;
		this.provides = provides;
		this.supports = supports;
		this.isFallback = isFallback;
	}

	async getEntries(
		interaction: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
	): Promise<DictionaryEntry[] | undefined> {
		const data = await this.fetch(lemma, learningLanguage).catch((reason) => {
			this.log.error(`Failed to get results for lemma '${lemma}' in ${learningLanguage}.`);
			this.log.error(reason);
			return undefined;
		});
		if (data === undefined) {
			return undefined;
		}

		let entries: DictionaryEntry[];
		try {
			entries = this.parse(interaction, lemma, learningLanguage, data);
		} catch (exception) {
			this.log.error(`Failed to format results for lemma '${lemma}' in ${learningLanguage}.`);
			this.log.error(exception);
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
