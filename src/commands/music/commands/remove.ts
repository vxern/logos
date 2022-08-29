import {
	ApplicationCommandOptionTypes,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import { index } from '../parameters.ts';

const command: OptionBuilder = {
	name: 'remove',
	nameLocalizations: {
		pl: 'usuń',
		ro: 'șterge',
	},
	description: 'Removes a song listing from the queue.',
	descriptionLocalizations: {
		pl: 'Usuwa wpis z kolejki muzycznej.',
		ro: 'Șterge o înregistrare din coadă.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: removeSongListing,
	options: [index],
};

function removeSongListing(
	client: Client,
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
	if (!canAct) return;

	/// TODO(vxern):
	/// Open a selection menu and allow the user to select the song listing to remove.
}

export default command;
