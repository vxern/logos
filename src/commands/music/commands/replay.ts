import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { collection } from 'logos/src/commands/parameters.ts';
import {
	getVoiceState,
	isCollection,
	isOccupied,
	replay,
	verifyCanManipulatePlayback,
} from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';

const command: OptionTemplate = {
	name: 'replay',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleReplayAction,
	options: [collection],
};

function handleReplayAction([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ collection }] = parseArguments(interaction.data?.options, { collection: 'boolean' });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManipulatePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const currentListing = controller.currentListing;

	if (!isOccupied(controller.player) || currentListing === undefined) {
		const strings = {
			noSongToReplay: localise(client, 'music.options.replay.strings.noSongToReplay', interaction.locale)(),
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
						description: strings.noSongToReplay,
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (collection !== undefined && !isCollection(currentListing?.content)) {
		const strings = {
			noSongCollectionToReplay: localise(
				client,
				'music.options.replay.strings.noSongCollectionToReplay',
				interaction.locale,
			)(),
			tryReplaying: localise(
				client,
				'music.options.replay.strings.tryReplayingSong',
				interaction.locale,
			)(),
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
						description: `${strings.noSongCollectionToReplay}\n\n${strings.tryReplaying}`,
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	return replay([client, bot], interaction, controller, collection ?? false);
}

export default command;
