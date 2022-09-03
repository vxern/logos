import {
	ApplicationCommandOptionTypes,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import { by, to } from '../parameters.ts';

const command: OptionBuilder = {
	name: 'rewind',
	nameLocalizations: {
		pl: 'przewiń-do-tyłu',
		ro: 'derulare-înapoi',
	},
	description: 'Rewinds the currently playing song.',
	descriptionLocalizations: {
		pl: 'Przewija obecnie grający utwór do tyłu.',
		ro: 'Derulează melodia în curs de redare înapoi.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: rewindSong,
	options: [by, to],
};

function rewindSong(
	_client: Client,
	_interaction: Interaction,
): void {
	/// TODO(vxern):
	/// If neither option has been supplied, reject interaction.
	/// If either option is not valid, reject interaction.
	/// If there is no song playing, reject interaction nicely.
	/// If the timestamp reaches farther than the beginning, replay it.
	/// Otherwise, rewind the song 'by' or 'to' the given timestamp.
}

export default command;
