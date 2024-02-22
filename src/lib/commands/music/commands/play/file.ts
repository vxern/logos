import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { SongListing } from "../../data/types";
import { handleRequestPlayback } from "./query";

async function handleRequestFilePlayback(
	client: Client,
	interaction: Logos.Interaction<any, { url: string }>,
): Promise<void> {
	const locale = interaction.locale;

	client.postponeReply(interaction);
	client.deleteReply(interaction);

	const strings = {
		externalFile: client.localise("music.options.play.strings.externalFile", locale)(),
	};

	const listing: SongListing = {
		requestedBy: interaction.user.id,
		managerIds: [],
		content: {
			type: "file",
			title: strings.externalFile,
			url: interaction.parameters.url,
		},
	};

	handleRequestPlayback(client, interaction, listing);
}

export { handleRequestFilePlayback };
