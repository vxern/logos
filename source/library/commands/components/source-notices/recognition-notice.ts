import type { Licence } from "logos:constants/licences";
import type { Client } from "logos/client";
import { SourceNotice } from "logos/commands/components/source-notices/source-notice";

class RecognitionSourceNotice extends SourceNotice {
	constructor(client: Client, { interaction, sources }: { interaction: Logos.Interaction; sources: Licence[] }) {
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
