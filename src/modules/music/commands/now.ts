import {
	ApplicationCommandInteraction,
	ApplicationCommandOptionType,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { mention, MentionType } from '../../../formatting.ts';
import { SongCollection } from '../data/song-collection.ts';

const command: Command = {
	name: 'now',
	availability: Availability.MEMBERS,
	description: 'Displays the currently playing song.',
	handle: now,
	options: [{
		name: 'show',
		description:
			'If set to true, information about the current song will be shown to others.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}],
};

function now(client: Client, interaction: Interaction): void {
	const controller = client.music.get(interaction.guild!.id)!;

	if (!controller.isOccupied) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'No song playing',
				description: 'There is no song to display the details of.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	const show =
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'show')?.value ??
			false;

	const current = controller.current!;
	const currentSong = controller.currentSong!;

	interaction.respond({
		ephemeral: !show,
		embeds: [{
			title: '⬇️ Now playing',
			fields: [
				...current.type === 'SONG_COLLECTION'
					? [{
						name: 'Collection',
						value: (<SongCollection> current.content).title,
					}, {
						name: 'Track',
						value: `${(<SongCollection> current.content).position + 1}/${
							(<SongCollection> current.content).songs.length
						}`,
					}]
					: [],
				{
					name: 'Title',
					value: `[${currentSong.title}](${currentSong.url})`,
					inline: true,
				},
				{
					name: 'Requested By',
					value: mention(current.requestedBy, MentionType.USER),
				},
			],
			footer: {
				text: `This listing was sourced from ${current.source}.`,
			},
		}],
	});
}

export default command;
