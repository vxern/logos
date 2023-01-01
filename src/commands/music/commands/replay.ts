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
import { collection } from 'logos/src/commands/parameters.ts';
import { getVoiceState, isCollection, isOccupied, replay, verifyVoiceState } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.replay),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleReplayAction,
	options: [collection],
};

function handleReplayAction([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const voiceState = getVoiceState(client, interaction);

	const isVoiceStateVerified = verifyVoiceState(bot, interaction, controller, voiceState);
	if (!isVoiceStateVerified) return;

	const [{ collection }] = parseArguments(interaction.data?.options, { collection: 'boolean' });

	const currentListing = controller.currentListing;

	if (!isOccupied(controller.player) || currentListing === undefined) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.replay.strings.noSongToReplay, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (collection !== undefined && !isCollection(currentListing?.content)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.replay.strings.noSongCollectionToReplay, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	return replay([client, bot], interaction, controller, collection ?? false);
}

export default command;
