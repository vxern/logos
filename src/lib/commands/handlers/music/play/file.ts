import { Client } from "logos/client";
import { handleRequestPlayback } from "logos/commands/handlers/music/play/query";
import { AudioStream, SongListing } from "logos/services/music";

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

	const listing: SongListing = new SongListing({
		queueable: new AudioStream({ title: strings.stream, url: interaction.parameters.url }),
		userId: interaction.user.id,
	});

	await handleRequestPlayback(client, interaction, listing);
}

export { handleRequestStreamPlayback };
