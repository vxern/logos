import type { Client } from "rost/client";
import { SourceNotice } from "rost/commands/components/source-notices/source-notice";
import type { SentenceIdPair } from "rost/stores/volatile";

class ContextSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, ids }: { interaction: Rost.Interaction; ids: SentenceIdPair[] }) {
		const links = ids.map((ids) => ({
			sentence: constants.links.tatoebaSentence(ids.sentenceId.toString()),
			translation: constants.links.tatoebaSentence(ids.translationId.toString()),
		}));

		const strings = constants.contexts.contextSentencesSourcedFrom({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		super(client, {
			interaction,
			sources: links.map((links, index) =>
				[
					`[${strings.sentence({ number: index + 1 })}](${links.sentence})`,
					`[${strings.translation({ number: index + 1 })}](${links.translation})`,
				].join(constants.special.sigils.separator),
			),
			notice: strings.sourcedFrom({ source: constants.licences.dictionaries.tatoeba.name }),
		});
	}

	async display(buttonPress: Rost.Interaction): Promise<void> {
		await this.client.reply(buttonPress, {
			embeds: [
				{
					color: constants.colours.blue,
					description: this.sources.map((source) => `${constants.emojis.link} ${source}`).join("\n"),
					footer: this.notice !== undefined ? { text: this.notice } : undefined,
				},
			],
		});
	}
}

export { ContextSourceNotice };
