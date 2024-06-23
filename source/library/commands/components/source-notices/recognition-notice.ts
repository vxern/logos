import type { Licence } from "logos:constants/licences.ts";
import type { Client } from "logos/client.ts";
import { SourceNotice } from "logos/commands/components/source-notices/source-notice.ts";

class RecognitionSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, sources }: { interaction: Logos.Interaction; sources: Licence[] }) {
		const strings = constants.contexts.recognitionsMadeBy({
			localise: client.localise.bind(client),
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
