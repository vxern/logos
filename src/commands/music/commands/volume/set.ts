import { Bot, Interaction } from 'discordeno';
import { getVoiceState, setVolume, verifyCanManagePlayback } from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments, reply } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

function handleSetVolume([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const [{ volume }] = parseArguments(interaction.data?.options, { volume: 'number' });
	if (volume === undefined || isNaN(volume)) return;

	if (volume < 0 || volume > configuration.music.limits.volume) {
		const strings = {
			title: localise(client, 'music.options.volume.options.set.strings.invalid.title', interaction.locale)(),
			description: localise(
				client,
				'music.options.volume.options.set.strings.invalid.description',
				interaction.locale,
			)({ 'volume': configuration.music.limits.volume }),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			}],
		});
	}

	setVolume(controller.player, volume);

	const strings = {
		title: localise(client, 'music.options.volume.options.set.strings.set.title', interaction.locale)(),
		description: localise(client, 'music.options.volume.options.set.strings.set.description', interaction.locale)(
			{ 'volume': volume },
		),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: `${constants.symbols.music.volume} ${strings.title}`,
			description: strings.description,
			color: constants.colors.blue,
		}],
	}, { visible: true });
}

export { handleSetVolume };
