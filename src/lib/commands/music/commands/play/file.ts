import { Client, localise } from "../../../../client.js";
import { deleteReply, parseArguments, postponeReply } from "../../../../interactions.js";
import { SongListing } from "../../data/types.js";
import { handleRequestPlayback } from "./query.js";
import * as Discord from "discordeno";

async function handleRequestFilePlayback(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ url }] = parseArguments(interaction.data?.options, {});
	if (url === undefined) {
		return;
	}

	postponeReply([client, bot], interaction);
	deleteReply([client, bot], interaction);

	const strings = {
		externalFile: localise(client, "music.options.play.strings.externalFile", interaction.locale)(),
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

	handleRequestPlayback([client, bot], interaction, listing);
}

export { handleRequestFilePlayback };
