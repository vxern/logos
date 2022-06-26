import {
	ApplicationCommandInteraction,
	ApplicationCommandOptionType,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { displayListings } from '../module.ts';

const command: Command = {
	name: 'queue',
	availability: Availability.MEMBERS,
	description: 'Displays a list of queued songs.',
	handle: queue,
	options: [{
		name: 'show',
		description: 'If set to true, the queue view will be shown to others.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}],
};

function queue(
	client: Client,
	interaction: Interaction,
): void {
	const controller = client.music.get(interaction.guild!.id)!;

	const show =
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'show')?.value ??
			false;

	displayListings({
		interaction: interaction,
		title: '📋 Queue',
		listings: controller.queue,
		show: show,
	});
}

export default command;
