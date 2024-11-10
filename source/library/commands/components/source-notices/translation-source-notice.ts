import type { Licence } from "logos:constants/licences";
import type { Client } from "logos/client";
import { SourceNotice } from "logos/commands/components/source-notices/source-notice";

class TranslationSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, source }: { interaction: Logos.Interaction; source: Licence }) {
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
