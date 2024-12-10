import type { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { handleFindWord } from "logos/commands/handlers/word";
import { LocalService } from "logos/services/service";
import { getSearchModeBySigil } from "logos:constants/dictionaries";

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

		const [sigil, word] = [match.at(1), match.at(2) || match.at(3)];
		if (word === undefined) {
			return;
		}

		const searchMode = sigil !== undefined ? getSearchModeBySigil(sigil) : "word";
		if (searchMode === undefined) {
			return;
		}

		const dummyInteraction = this.client.interactions.buildDummyInteraction(message, { parameters: { word } });
		if (dummyInteraction === undefined) {
			return;
		}

		await handleFindWord(this.client, dummyInteraction, { searchMode });
	}
}

export { WordSigilService };
