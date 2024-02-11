import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { deleteReply, parseArguments, postponeReply } from "../../../../interactions";
import { SongListing } from "../../data/types";
import { handleRequestPlayback } from "./query";

async function handleRequestFilePlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const [{ url }] = parseArguments(interaction.data?.options, {});
	if (url === undefined) {
		return;
	}

	postponeReply(client, interaction);
	deleteReply(client, interaction);

	const strings = {
		externalFile: client.localise("music.options.play.strings.externalFile", locale)(),
	};

	const listing: SongListing = {
		requestedBy: interaction.user.id,
		managerIds: [],
		content: {
			type: "file",
			title: strings.externalFile,
			url,
		},
	};

	handleRequestPlayback(client, interaction, listing);
}

export { handleRequestFilePlayback };
