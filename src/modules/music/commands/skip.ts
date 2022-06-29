import {
	ApplicationCommandInteraction,
	ApplicationCommandOptionType,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { underlined } from '../../../formatting.ts';
import { SongCollection } from '../data/song-collection.ts';

const command: Command = {
	name: 'skip',
	availability: Availability.MEMBERS,
	description: 'Skips the currently playing song.',
	handle: skip,
	options: [{
		name: 'collection',
		description:
			'If set to true, this command will skip all songs in a song collection.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}, {
		name: 'by',
		description: 'The number of songs to skip by.',
		type: ApplicationCommandOptionType.INTEGER,
	}, {
		name: 'to',
		description: 'The track to skip to.',
		type: ApplicationCommandOptionType.INTEGER,
	}],
};

async function skip(client: Client, interaction: Interaction): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const skipCollection =
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'collection')?.value ??
			false;
	let by = Number(
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'by')?.value,
	);
	let to = Number(
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'to')?.value,
	);

	if (!controller.isOccupied) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Nothing to skip',
				description: 'There is no song to skip.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	const isCollection = controller.current!.type === 'SONG_COLLECTION';

	if (skipCollection && !isCollection) {
		const additionalTooltip = controller.isOccupied
			? ' Try skipping the current song instead.'
			: '';

		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Not playing a collection',
				description: `There is no song collection to skip.${additionalTooltip}`,
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	if (!Number.isNaN(by) && !Number.isNaN(to)) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Too many skip operations',
				description: `You may not skip by a number of songs ${
					underlined('and')
				} skip to a certain song in the same query.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	if (by <= 0 || to <= 0) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'No negative integers or 0',
				description:
					'The skip operation may not be defined by negative integers or 0.',
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	if (!Number.isNaN(by)) {
		if (isCollection && !skipCollection) {
			const collection = <SongCollection> controller.current!.content;

			by = Math.min(by, collection.songs.length - (collection.position + 1));
		} else {
			by = Math.min(by, controller.queue.length);
		}
	}

	if (!Number.isNaN(to)) {
		if (isCollection && !skipCollection) {
			const collection = <SongCollection> controller.current!.content;

			to = Math.min(to, collection.songs.length);
		} else {
			to = Math.min(to, controller.queue.length);
		}
	}

	controller.skip(skipCollection, {
		by: !Number.isNaN(by) ? by : undefined,
		to: !Number.isNaN(to) ? to : undefined,
	});

	interaction.respond({
		embeds: [{
			title: '⏭️ Skipped',
			description: `The ${
				!skipCollection ? 'song' : 'song collection'
			} has been skipped.`,
			color: configuration.interactions.responses.colors.invisible,
		}],
	});
	return;
}

export default command;
