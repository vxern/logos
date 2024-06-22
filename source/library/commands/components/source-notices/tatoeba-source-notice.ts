import { SourceNotice } from "logos/commands/components/source-notices/source-notice.ts";
import type { Client } from "logos/client.ts";

class TatoebaSourceNotice extends SourceNotice {
	constructor(
		client: Client,
		{
			interaction,
			sentenceId,
			translationId,
		}: { interaction: Logos.Interaction; sentenceId: number; translationId: number },
	) {
		const sentenceLink = constants.links.tatoebaSentence(sentenceId.toString());
		const translationLink = constants.links.tatoebaSentence(translationId.toString());

		const strings = constants.contexts.sentencesSourcedFrom({
			localise: client.localise.bind(client),
			locale: interaction.displayLocale,
		});
		super(client, {
			interaction,
			showable: true,
			sources: [`[${strings.sentence}](${sentenceLink})`, `[${strings.translation}](${translationLink})`],
			notice: strings.sourcedFrom({ source: constants.licences.dictionaries.tatoeba.name }),
		});
	}
}

export { TatoebaSourceNotice };
