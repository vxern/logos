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
import { getVoiceState, isCollection, isOccupied, verifyCanManagePlayback } from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'loop',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleLoopPlayback,
	options: [collection],
};

function handleLoopPlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
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

	if (!collection) {
		if (!isOccupied(controller.player) || currentListing === undefined) {
			const strings = {
				title: localise(client, 'music.options.loop.strings.noSong.title', interaction.locale)(),
				description: localise(client, 'music.options.loop.strings.noSong.description', interaction.locale)(),
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
	} else {
		if (!isOccupied(controller.player) || currentListing === undefined) {
			const strings = {
				title: localise(
					client,
					'music.options.loop.strings.noSongCollection.title',
					interaction.locale,
				)(),
				description: {
					noSongCollection: localise(
						client,
						'music.options.loop.strings.noSongCollection.description.noSongCollection',
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
							description: strings.description.noSongCollection,
							color: constants.colors.dullYellow,
						}],
					},
				},
			);
		} else if (!isCollection(currentListing.content)) {
			const strings = {
				title: localise(
					client,
					'music.options.loop.strings.noSongCollection.title',
					interaction.locale,
				)(),
				description: {
					noSongCollection: localise(
						client,
						'music.options.loop.strings.noSongCollection.description.noSongCollection',
						interaction.locale,
					)(),
					trySongInstead: localise(
						client,
						'music.options.loop.strings.noSongCollection.description.trySongInstead',
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
	}

	if (collection) {
		controller.flags.loop.collection = !controller.flags.loop.collection;

		if (!controller.flags.loop.collection) {
			const strings = {
				title: localise(client, 'music.options.loop.strings.disabled.title', defaultLocale)(),
				description: localise(
					client,
					'music.options.loop.strings.disabled.description.songCollection',
					defaultLocale,
				)(),
			};

			return void sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						embeds: [{
							title: `${constants.symbols.music.loopDisabled} ${strings.title}`,
							description: strings.description,
							color: constants.colors.blue,
						}],
					},
				},
			);
		}

		const strings = {
			title: localise(client, 'music.options.loop.strings.enabled.title', defaultLocale)(),
			description: localise(client, 'music.options.loop.strings.enabled.description.songCollection', defaultLocale)(),
		};

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						title: `${constants.symbols.music.loopEnabled} ${strings.title}`,
						description: strings.description,
						color: constants.colors.blue,
					}],
				},
			},
		);
	}

	controller.flags.loop.song = !controller.flags.loop.song;

	if (!controller.flags.loop.song) {
		const strings = {
			title: localise(client, 'music.options.loop.strings.disabled.title', defaultLocale)(),
			description: localise(
				client,
				'music.options.loop.strings.disabled.description.song',
				defaultLocale,
			)(),
		};

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						title: `${constants.symbols.music.loopDisabled} ${strings.title}`,
						description: strings.description,
						color: constants.colors.blue,
					}],
				},
			},
		);
	}

	const strings = {
		title: localise(client, 'music.options.loop.strings.enabled.title', defaultLocale)(),
		description: localise(client, 'music.options.loop.strings.enabled.description.song', defaultLocale)(),
	};

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${constants.symbols.music.loopEnabled} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				}],
			},
		},
	);
}

export default command;
