import { Bot, Interaction } from 'discordeno';
import { handleRequestQueryPlayback } from 'logos/src/commands/music/commands/play/query.ts';
import { SongListingContentTypes } from 'logos/src/commands/music/data/types.ts';
import { Client, localise } from 'logos/src/client.ts';

function handleRequestFilePlayback([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const strings = {
		externalFile: localise(client, 'music.options.play.strings.externalFile', interaction.locale)(),
	};

	return handleRequestQueryPlayback(
		[client, bot],
		interaction,
		(_, interaction, query) =>
			new Promise((resolve) =>
				resolve({
					requestedBy: interaction.user.id,
					managerIds: [],
					content: {
						type: SongListingContentTypes.File,
						title: strings.externalFile,
						url: query,
					},
				})
			),
	);
}

export { handleRequestFilePlayback };
