import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { OptionTemplate } from 'logos/src/lib/commands/command.ts';
import { getVoiceState, reset, verifyCanManagePlayback } from 'logos/src/lib/controllers/music.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { reply } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';
import { defaultLocale } from 'logos/src/types.ts';

const command: OptionTemplate = {
	name: 'stop',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleStopPlayback,
};

function handleStopPlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const botVoiceState = getVoiceState(client, interaction.guildId!, bot.id);
	if (botVoiceState === undefined) {
		const strings = {
			title: localise(client, 'music.options.stop.strings.notPlaying.title', interaction.locale)(),
			description: localise(client, 'music.options.stop.strings.notPlaying.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	reset(client, interaction.guildId!);

	const strings = {
		title: localise(client, 'music.options.stop.strings.stopped.title', defaultLocale)(),
		description: localise(client, 'music.options.stop.strings.stopped.description', defaultLocale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: `${constants.symbols.music.stopped} ${strings.title}`,
			description: strings.description,
			color: constants.colors.blue,
		}],
	}, { visible: true });
}

export default command;
