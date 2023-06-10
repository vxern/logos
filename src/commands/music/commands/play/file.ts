import { Bot, Interaction } from 'discordeno';
import { handleRequestPlayback } from 'logos/src/commands/music/commands/play/query.ts';
import { SongListing, SongListingContentTypes } from 'logos/src/commands/music/data/types.ts';
import { Client, localise } from 'logos/src/client.ts';
import { deleteReply, parseArguments, postponeReply } from 'logos/src/interactions.ts';

function handleRequestFilePlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ url }] = parseArguments(interaction.data?.options, {});
	if (url === undefined) return;

	postponeReply([client, bot], interaction);
	deleteReply([client, bot], interaction);

	const strings = {
		externalFile: localise(client, 'music.options.play.strings.externalFile', interaction.locale)(),
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
