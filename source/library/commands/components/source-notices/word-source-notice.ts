import { SourceNotice } from "logos/commands/components/source-notices/source-notice.ts";
import type { Client } from "logos/client.ts";

class WordSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, sources }: { interaction: Logos.Interaction; sources: string[] }) {
		const strings = constants.contexts.sourcedFromDictionaries({
			localise: client.localise.bind(client),
			locale: interaction.displayLocale,
		});

		super(client, {
			interaction,
			sources,
			notice: strings.sourcedResponsibly({
				dictionaries: client.pluralise(
					"word.strings.sourcedResponsibly.dictionaries",
					interaction.displayLocale,
					{ quantity: sources.length },
				),
			}),
		});
	}
}

export { WordSourceNotice };
