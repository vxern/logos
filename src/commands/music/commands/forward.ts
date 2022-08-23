import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import { by, to } from '../parameters.ts';

const command: CommandBuilder = {
	name: 'forward',
	nameLocalizations: {
		pl: 'przewiń-do-przodu',
		ro: 'derulează-înainte',
	},
	description: 'Fast-forwards the currently playing song.',
	descriptionLocalizations: {
		pl: 'Przewija obecnie grający utwór do przodu.',
		ro: 'Derulează melodia în curs de redare înainte.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: fastForwardSong,
	options: [by, to],
};

function fastForwardSong(_client: Client, _interaction: Interaction): void {
	/// TODO(vxern):
	/// If neither option has been supplied, reject interaction.
	/// If either option is not valid, reject interaction.
	/// If there is no song playing, reject interaction nicely.
	/// If the timestamp reaches farther than the duration of the song, skip it.
	/// Otherwise, fast-forward the song 'by' or 'to' the given timestamp.
}

export default command;
