import type { Licence } from "rost:constants/licences";
import type { Client } from "rost/client";
import { SourceNotice } from "rost/commands/components/source-notices/source-notice";

class TranslationSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, source }: { interaction: Rost.Interaction; source: Licence }) {
		const strings = constants.contexts.translationsSourcedFrom({
			localise: client.localise,
			locale: interaction.displayLocale,
		});

		super(client, {
			interaction,
			sources: [strings.sourcedFrom({ source: `[${source.name}](${source.link})` })],
		});
	}
}

export { TranslationSourceNotice };
