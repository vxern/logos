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
	name: 'volume',
	availability: Availability.MEMBERS,
	options: [{
		name: 'display',
		description: 'Displays the volume of playback.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: display,
		options: [{
			name: 'show',
			description: 'If set to true, the queue view will be shown to others.',
			type: ApplicationCommandOptionType.BOOLEAN,
		}],
	}, {
		name: 'set',
		description: 'Sets the volume of playback.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: set,
		options: [{
			name: 'volume',
			description: `A value between 0 and ${configuration.music.maxima.volume}`,
			required: true,
			type: ApplicationCommandOptionType.INTEGER,
		}],
	}],
};

function display(
	client: Client,
	interaction: Interaction,
): void {
	const controller = client.music.get(interaction.guild!.id)!;

	const show =
		(<ApplicationCommandInteraction> interaction).data.options[0]!.options![0]
			?.value ??
			false;

	interaction.respond({
		ephemeral: !show,
		embeds: [{
			title: '🔊 Volume',
			description: `The current volume is ${controller.volume}%.`,
			color: configuration.interactions.responses.colors.invisible,
		}],
	});
}

async function set(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const volume = Number(
		(<ApplicationCommandInteraction> interaction).data.options[0]!.options![0]!
			.value! as string,
	);

	if (volume < 0 || volume > configuration.music.maxima.volume) {
		interaction.respond({
			embeds: [{
				title: 'Invalid volume',
				description:
					`Song volume may not be negative, and it may not be bigger than ${configuration.music.maxima.volume}%.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	controller.setVolume(volume);

	interaction.respond({
		embeds: [{
			title: '🔊 Volume set',
			description: `The volume has been set to ${volume}%.`,
			color: configuration.interactions.responses.colors.invisible,
		}],
	});
}

export default command;
