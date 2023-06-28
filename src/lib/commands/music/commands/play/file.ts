import { Bot, Interaction } from "discordeno";
import { handleRequestPlayback } from "./query.js";
import { SongListing, SongListingContentTypes } from "../../data/types.js";
import { Client, localise } from "../../../../client.js";
import { deleteReply, parseArguments, postponeReply } from "../../../../interactions.js";

function handleRequestFilePlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ url }] = parseArguments(interaction.data?.options, {});
	if (url === undefined) return;

	postponeReply([client, bot], interaction);
	deleteReply([client, bot], interaction);

	const strings = {
		externalFile: localise(client, "music.options.play.strings.externalFile", interaction.locale)(),
	};

	const listing: SongListing = {
		requestedBy: interaction.user.id,
		managerIds: [],
		content: {
			type: SongListingContentTypes.File,
			title: strings.externalFile,
			url,
		},
	};

	return handleRequestPlayback([client, bot], interaction, listing);
}

export { handleRequestFilePlayback };
