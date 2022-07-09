import {
	ApplicationCommandInteraction,
	ApplicationCommandOptionType,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';

const command: Command = {
	name: 'unskip',
	availability: Availability.MEMBERS,
	description: 'Plays the last played song.',
	handle: unskip,
	options: [{
		name: 'collection',
		description:
			'If set to true, this command will unskip all songs in the current song collection.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}, {
		name: 'by',
		description: 'The number of songs to unskip by.',
		type: ApplicationCommandOptionType.INTEGER,
	}, {
		name: 'to',
		description: 'The track to unskip to.',
		type: ApplicationCommandOptionType.INTEGER,
	}],
};

async function unskip(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const unskipCollection =
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

	if (unskipCollection && controller.current?.content.type !== 'COLLECTION') {
		const additionalTooltip = controller.isOccupied
			? ' Try unskipping the current song instead.'
			: '';

		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Not playing a collection',
				description:
					`There is no song collection to unskip.${additionalTooltip}`,
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	if (
		unskipCollection ||
		(controller.current?.content.type === 'COLLECTION' &&
			(controller.current.content.position === 0))
	) {
		if (controller.history.length === 0) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'Nothing to unskip',
					description: 'There is nothing to unskip.',
					color: configuration.interactions.responses.colors.yellow,
				}],
			});
			return;
		}

		if (controller.isOccupied && !controller.canPushToQueue) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'The queue is full',
					description:
						'The last played song listing cannot be unskipped because the song queue is already full.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return;
		}
	}

	if (!Number.isNaN(by) && !Number.isNaN(to)) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Too many skip operations',
				description: `You may not unskip by a number of songs __and__ unskip to a certain song in the same query.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	if (!Number.isNaN(by)) {
		if (
			controller.current?.content.type === 'COLLECTION' && !unskipCollection
		) {
			by = Math.min(by, controller.current.content.position);
		} else {
			by = Math.min(by, controller.history.length);
		}
	}

	if (!Number.isNaN(to)) {
		if (
			controller.current?.content.type === 'COLLECTION' && !unskipCollection
		) {
			to = Math.max(to, 1);
		} else {
			to = Math.min(to, controller.history.length);
		}
	}

	controller.unskip(unskipCollection, {
		by: !Number.isNaN(by) ? by : undefined,
		to: !Number.isNaN(to) ? to : undefined,
	});

	interaction.respond({
		embeds: [{
			title: '⏮️ Unskipped',
			description: 'The last played song listing has been brought back.',
			color: configuration.interactions.responses.colors.invisible,
		}],
	});
}

export default command;
