import { Bot, Interaction } from 'discordeno';
import { getVoiceState, verifyVoiceState } from 'logos/src/lib/controllers/music.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { parseArguments, reply } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';
import { defaultLocale } from 'logos/src/types.ts';

function handleDisplayVolume([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyVoiceState(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
		'check',
	);
	if (!isVoiceStateVerified) return;

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		title: localise(client, 'music.options.volume.options.display.strings.volume.title', locale)(),
		description: localise(client, 'music.options.volume.options.display.strings.volume.description', locale)(
			{ 'volume': controller.player.volume },
		),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: `${constants.symbols.music.volume} ${strings.title}`,
			description: strings.description,
			color: constants.colors.blue,
		}],
	}, { visible: show });
}

export { handleDisplayVolume };
