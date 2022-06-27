import {
	_,
	ApplicationCommandInteraction,
	ApplicationCommandOptionType,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { displayListings } from '../module.ts';

const command: Command = {
	name: 'history',
	availability: Availability.MEMBERS,
	description: 'Displays a list of previously played songs.',
	handle: history,
	options: [{
		name: 'show',
		description: 'If set to true, the queue view will be shown to others.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}],
};

function history(
	client: Client,
	interaction: Interaction,
): void {
	const controller = client.music.get(interaction.guild!.id)!;

	const show =
		(<ApplicationCommandInteraction> interaction).data.options?.find((
			option,
		) => option.name === 'show')?.value ??
			false;

	const history = _.cloneDeep(controller.history);

	history.reverse();

	displayListings({
		interaction: interaction,
		title: '📋 History',
		listings: history,
		show: show,
	});
}

export default command;
