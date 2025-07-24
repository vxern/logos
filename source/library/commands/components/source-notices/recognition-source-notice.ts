import type { Licence } from "rost:constants/licences";
import type { Client } from "rost/client";
import { SourceNotice } from "rost/commands/components/source-notices/source-notice";

class RecognitionSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, sources }: { interaction: Rost.Interaction; sources: Licence[] }) {
		const strings = constants.contexts.recognitionsMadeBy({
			localise: client.localise,
			locale: interaction.displayLocale,
		});

		super(client, {
			interaction,
			sources: sources.map((source) => `[${source.name}](${source.link})`),
			notice: strings.recognitionsMadeBy,
		});
	}
}

export { RecognitionSourceNotice };
