import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { timestamp } from 'logos/src/commands/parameters.ts';
import { getVoiceState, isOccupied, skipTo, verifyCanManagePlayback } from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments, parseTimeExpression } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'skip-to',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipToTimestamp,
	options: [timestamp],
};

async function handleSkipToTimestamp([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ timestamp: timestampExpression }, focused] = parseArguments(interaction.data?.options, {});

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	if (focused !== undefined) {
		const timestamp = parseTimeExpression(client, timestampExpression!, false, interaction.locale);

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: timestamp === undefined ? [] : [{ name: timestamp[0], value: timestamp[1].toString() }],
				},
			},
		);
	}

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const playingSince = controller.player.playingSince!;

	if (!isOccupied(controller.player)) {
		const strings = {
			title: localise(client, 'music.options.skip-to.strings.noSong.title', interaction.locale)(),
			description: localise(client, 'music.options.skip-to.strings.noSong.title', interaction.locale)(),
		};

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (Number.isNaN(timestampExpression)) {
		const strings = {
			title: localise(client, 'music.options.skip-to.strings.invalidTimestamp.title', interaction.locale)(),
			description: localise(client, 'music.options.skip-to.strings.invalidTimestamp.description', interaction.locale)(),
		};

		return displayError(bot, interaction, strings.title, strings.description);
	}

	const timestamp = Number(timestampExpression);

	if (timestamp < 0) {
		skipTo(controller.player, 0);
	} else if (timestamp > playingSince) {
		skipTo(controller.player, playingSince);
	} else {
		skipTo(controller.player, timestamp);
	}

	const strings = {
		title: localise(client, 'music.options.skip-to.strings.skippedTo.title', defaultLocale)(),
		description: localise(client, 'music.options.skip-to.strings.skippedTo.description', defaultLocale)(),
	};

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${constants.symbols.music.skippedTo} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				}],
			},
		},
	);
}

function displayError(bot: Bot, interaction: Interaction, title: string, description: string): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{ title, description, color: constants.colors.dullYellow }],
			},
		},
	);
}

export default command;
