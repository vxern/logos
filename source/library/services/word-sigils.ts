import { type DictionarySearchMode, getSearchModeBySigil } from "logos:constants/dictionaries";
import {
	type LearningLanguage,
	getLearningLanguageByLocale,
	isLearningLanguage,
	isLearningLocale,
} from "logos:constants/languages/learning";
import type { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { handleFindWord } from "logos/commands/handlers/word";
import { LocalService } from "logos/services/service";

class WordSigilService extends LocalService {
	readonly #messageCreates: Collector<"messageCreate">;

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "WordSigilService", guildId });

		this.#messageCreates = new Collector({ guildId });
	}

	async start(): Promise<void> {
		this.#messageCreates.onCollect(this.#handleMessageCreate.bind(this));

		await this.client.registerCollector("messageCreate", this.#messageCreates);
	}

	async #handleMessageCreate(message: Discord.Message): Promise<void> {
		const match = constants.patterns.wordSigil.exec(message.content);
		if (match === null) {
			return;
		}

		const [sigil, word, rawLanguage] = [match.at(1), match.slice(2, 7).find((word) => word), match.at(7)];
		if (word === undefined) {
			return;
		}

		let searchMode: DictionarySearchMode | undefined;
		if (sigil !== undefined) {
			searchMode = getSearchModeBySigil(sigil);
		}

		let language: LearningLanguage | undefined;
		if (rawLanguage === undefined) {
			language = undefined;
		} else if (isLearningLanguage(rawLanguage)) {
			language = rawLanguage;
		} else if (isLearningLocale(rawLanguage)) {
			language = getLearningLanguageByLocale(rawLanguage);
		}

		const messageInteraction = this.client.interactions.buildMessageInteraction(message, {
			parameters: { word, language },
		});
		if (messageInteraction === undefined) {
			return;
		}

		await handleFindWord(this.client, messageInteraction, { searchMode });
	}
}

export { WordSigilService };
