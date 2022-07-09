import {
	ApplicationCommandInteraction,
	ApplicationCommandOptionType,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { mention } from '../../../formatting.ts';
import { chunk, paginate, trim } from '../../../utils.ts';
import { SongCollection } from '../data/song-collection.ts';

const command: Command = {
	name: 'now',
	availability: Availability.MEMBERS,
	description: 'Displays the currently playing song.',
	handle: now,
	options: [{
		name: 'collection',
		description:
			'If set to true, information about the current collection will be shown instead.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}, {
		name: 'show',
		description:
			'If set to true, the information will be shown to others in chat.',
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

	const showCollection =
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'collection')?.value ??
			false;
	const show =
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'show')?.value ??
			false;

	const current = controller.current!;

	if (showCollection) {
		if (current.content?.type !== 'COLLECTION') {
			const additionalTooltip = controller.isOccupied
				? ' Try requesting information about the current song instead.'
				: '';

			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'Not playing a collection',
					description:
						`There is no song collection to show the details of.${additionalTooltip}`,
					color: configuration.interactions.responses.colors.yellow,
				}],
			});

			return;
		}

		const collection = <SongCollection> controller.current!.content;

		paginate({
			interaction: interaction,
			elements: chunk(collection.songs, configuration.music.maxima.songs.page),
			embed: {
				title: '⬇️ Now playing',
				color: configuration.interactions.responses.colors.blue,
			},
			view: {
				title: 'Songs',
				generate: (songs, pageIndex) =>
					songs.length !== 0
						? songs.map((song, index) => {
							const isCurrent = pageIndex * 10 + index === collection.position;
							const songString = `[${
								trim(
									song.title
										.replaceAll('(', '❨')
										.replaceAll(')', '❩')
										.replaceAll('[', '⁅')
										.replaceAll(']', '⁆'),
									50,
								)
							}](${song.url})`;

							return `${pageIndex * 10 + (index + 1)}. ${
								isCurrent ? `**${songString}**` : songString
							}`;
						}).join('\n')
						: 'This list is empty.',
			},
			show: show,
		});

		return;
	}

	const currentSong = controller.currentSong!;

	interaction.respond({
		ephemeral: !show,
		embeds: [{
			title: '⬇️ Now playing',
			fields: [
				...current.content.type === 'COLLECTION'
					? [{
						name: 'Collection',
						value: current.content.title,
					}, {
						name: 'Track',
						value: `${
							current.content.position + 1
						}/${current.content.songs.length}`,
					}]
					: [],
				{
					name: 'Title',
					value: `[${currentSong.title}](${currentSong.url})`,
					inline: true,
				},
				{
					name: 'Requested By',
					value: mention(current.requestedBy, 'USER'),
				},
			],
			footer: {
				text: `This listing was sourced from ${
					current.source ?? 'the internet'
				}.`,
			},
		}],
	});
}

export default command;
