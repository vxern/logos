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
	verifyCanManagePlayback,
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

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const currentListing = controller.currentListing;

	if (!isOccupied(controller.player) || currentListing === undefined) {
		const strings = {
			title: localise(client, 'music.options.replay.strings.noSong.title', interaction.locale)(),
			description: localise(client, 'music.options.replay.strings.noSong.description', interaction.locale)(),
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

	if (collection !== undefined && !isCollection(currentListing?.content)) {
		const strings = {
			title: localise(
				client,
				'music.options.replay.strings.noSongCollection.title',
				interaction.locale,
			)(),
			description: {
				noSongCollection: localise(
					client,
					'music.options.replay.strings.noSongCollection.description.noSongCollection',
					interaction.locale,
				)(),
				trySongInstead: localise(
					client,
					'music.options.replay.strings.noSongCollection.description.trySongInstead',
					interaction.locale,
				)(),
			},
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
						description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	return replay([client, bot], interaction, controller, collection ?? false);
}

export default command;
