import type { Client } from "rost/client";
import { SourceNotice } from "rost/commands/components/source-notices/source-notice";

class WordSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, sources }: { interaction: Rost.Interaction; sources: string[] }) {
		const strings = constants.contexts.sourcedFromDictionaries({
			localise: client.localise,
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
