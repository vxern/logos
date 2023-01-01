import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { timestamp } from 'logos/src/commands/parameters.ts';
import { getVoiceState, isOccupied, skipTo, verifyVoiceState } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments, parseTimeExpression } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.skipTo),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipToTimestamp,
	options: [timestamp],
};

async function handleSkipToTimestamp(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const voiceState = getVoiceState(client, interaction);

	const isVoiceStateVerified = verifyVoiceState(bot, interaction, controller, voiceState);
	if (!isVoiceStateVerified) return;

	const [{ timestamp: timestampExpression }, focused] = parseArguments(interaction.data?.options, {});

	if (focused !== undefined) {
		const timestamp = parseTimeExpression(timestampExpression!, interaction.locale);

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

	const playingSince = controller.player.playingSince!;

	if (!isOccupied(controller.player)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.strings.notPlayingMusic, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (Number.isNaN(timestampExpression)) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.invalidDuration, interaction.locale),
		);
	}

	const timestamp = Number(timestampExpression);

	if (timestamp < 0) {
		skipTo(controller.player, 0);
	} else if (timestamp > playingSince) {
		skipTo(controller.player, playingSince);
	} else {
		skipTo(controller.player, timestamp);
	}

	const skippedToString = localise(Commands.music.options.skipTo.strings.skippedTo.header, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `🔍 ${skippedToString}`,
					description: localise(Commands.music.options.skipTo.strings.skippedTo.body, defaultLocale),
					color: constants.colors.blue,
				}],
			},
		},
	);
}

function displayError(bot: Bot, interaction: Interaction, error: string): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: error,
					color: constants.colors.dullYellow,
				}],
			},
		},
	);
}

export default command;
