import { SongListing } from "logos:constants/music";
import { Client } from "logos/client";
import { handleRequestPlayback } from "logos/commands/handlers/music/play/query";

async function handleRequestStreamPlayback(
	client: Client,
	interaction: Logos.Interaction<any, { url: string }>,
): Promise<void> {
	const locale = interaction.locale;

	await client.postponeReply(interaction);
	await client.deleteReply(interaction);

	const strings = {
		stream: client.localise("music.options.play.strings.stream", locale)(),
	};

	const listing: SongListing = {
		requestedBy: interaction.user.id,
		managerIds: [],
		content: {
			type: "stream",
			title: strings.stream,
			url: interaction.parameters.url,
		},
	};

	await handleRequestPlayback(client, interaction, listing);
}

export { handleRequestStreamPlayback };
