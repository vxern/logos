import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/mod.ts';
import { Client } from 'logos/src/mod.ts';
import { by, to } from 'logos/src/commands/music/mod.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.forward),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: fastForwardSong,
	options: [by, to],
};

function fastForwardSong(
	_clientWithBot: [Client, Bot],
	_interaction: Interaction,
): void {
	/// TODO(vxern):
	/// If neither option has been supplied, reject interaction.
	/// If either option is not valid, reject interaction.
	/// If there is no song playing, reject interaction nicely.
	/// If the timestamp reaches farther than the duration of the song, skip it.
	/// Otherwise, fast-forward the song 'by' or 'to' the given timestamp.
}

export default command;
