import type { Client } from "rost/client";
import { SourceNotice } from "rost/commands/components/source-notices/source-notice";

class TatoebaSourceNotice extends SourceNotice {
	constructor(
		client: Client,
		{
			interaction,
			sentenceId,
			translationId,
		}: { interaction: Rost.Interaction; sentenceId: number; translationId: number },
	) {
		const sentenceLink = constants.links.tatoebaSentence(sentenceId.toString());
		const translationLink = constants.links.tatoebaSentence(translationId.toString());

		const strings = constants.contexts.gameSentencesSourcedFrom({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		super(client, {
			interaction,
			sources: [`[${strings.sentence}](${sentenceLink})`, `[${strings.translation}](${translationLink})`],
			notice: strings.sourcedFrom({ source: constants.licences.dictionaries.tatoeba.name }),
		});
	}
}

export { TatoebaSourceNotice };
