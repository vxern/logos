import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import { by, to } from '../parameters.ts';

const command: CommandBuilder = {
	name: 'rewind',
	nameLocalizations: {
		pl: 'przewiń-do-tyłu',
		ro: 'derulează-înapoi',
	},
	description: 'Rewinds the currently playing song.',
	descriptionLocalizations: {
		pl: 'Przewija obecnie grający utwór do tyłu.',
		ro: 'Derulează melodia în curs de redare înapoi.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [by, to],
	handle: rewindSong,
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
