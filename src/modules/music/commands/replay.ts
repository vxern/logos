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
	name: 'replay',
	availability: Availability.MEMBERS,
	description: 'Begins playing the currently playing song from the start.',
	handle: replay,
	options: [{
		name: 'collection',
		description:
			'If set to true, this command will skip all songs in a song collection.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}],
};

async function replay(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const replayCollection =
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'collection')?.value ??
			false;

	if (!controller.isOccupied) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Nothing to replay',
				description: 'There is no song to replay.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	if (replayCollection && controller.current!.type !== 'SONG_COLLECTION') {
		const additionalTooltip = controller.isOccupied
			? ' Try replaying the current song instead.'
			: '';

		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Not playing a collection',
				description:
					`There is no song collection to replay.${additionalTooltip}`,
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
	}

	controller.replay(interaction, replayCollection);
}

export default command;
