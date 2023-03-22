import {
	ActionRow,
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	deleteOriginalInteractionResponse,
	editOriginalInteractionResponse,
	Interaction,
	InteractionCallbackData,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	SelectOption,
	sendInteractionResponse,
} from 'discordeno';
import { listingTypeToEmoji, SongListing } from 'logos/src/commands/music/data/types.ts';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import {
	getVoiceState,
	isQueueEmpty,
	MusicController,
	remove,
	verifyCanManipulatePlayback,
} from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { ControlButtonID, createInteractionCollector, decodeId, generateButtons } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes, trim } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'remove',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleRemoveSongListing,
};

function handleRemoveSongListing([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManipulatePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	if (isQueueEmpty(controller.listingQueue)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(client, 'music.options.remove.strings.noListingToRemove', interaction.locale)(),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	const removeListingData = { pageIndex: 0 };

	const interactionResponseData = generateEmbed(
		[client, bot],
		interaction,
		controller,
		removeListingData,
		interaction.locale,
	);

	const onQueueUpdateListener = () =>
		editOriginalInteractionResponse(
			bot,
			interaction.token,
			generateEmbed([client, bot], interaction, controller, removeListingData, interaction.locale),
		);

	const onStopListener = () => deleteOriginalInteractionResponse(bot, interaction.token);

	controller.events.on('queueUpdate', onQueueUpdateListener);
	controller.events.on('stop', onStopListener);

	setTimeout(
		() => controller.events.off('queueUpdate', onQueueUpdateListener),
		constants.interactionTokenExpiryInterval,
	);
	setTimeout(() => controller.events.off('stop', onStopListener), constants.interactionTokenExpiryInterval);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				...interactionResponseData,
			},
		},
	);
}

interface RemoveListingData {
	pageIndex: number;
}

function generateEmbed(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	controller: MusicController,
	data: RemoveListingData,
	locale: string | undefined,
): InteractionCallbackData {
	const pages = chunk(controller.listingQueue, configuration.music.limits.songs.page);

	const isFirst = data.pageIndex === 0;
	const isLast = data.pageIndex === pages.length - 1;

	const buttonsCustomId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: (bot, selection) => {
			if (selection.data === undefined) return;

			const [_, action] = decodeId<ControlButtonID>(selection.data.customId!);

			switch (action) {
				case 'previous':
					if (!isFirst) data.pageIndex--;
					break;
				case 'next':
					if (!isLast) data.pageIndex++;
					break;
			}

			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			editOriginalInteractionResponse(
				bot,
				interaction.token,
				generateEmbed([client, bot], interaction, controller, data, locale),
			);
		},
	});

	const selectMenuCustomId = createInteractionCollector(
		[client, bot],
		{
			type: InteractionTypes.MessageComponent,
			userId: interaction.user.id,
			limit: 1,
			onCollect: (bot, selection) => {
				const indexString = selection.data?.values?.at(0) as string | undefined;
				if (indexString === undefined) return;

				const index = Number(indexString);
				if (isNaN(index)) return;

				const songListing = remove(controller, index);
				if (songListing === undefined) {
					return void sendInteractionResponse(
						bot,
						selection.id,
						selection.token,
						{
							type: InteractionResponseTypes.ChannelMessageWithSource,
							data: {
								embeds: [{
									description: localise(
										client,
										'music.options.remove.strings.failedToRemoveSong',
										interaction.locale,
									)(),
									color: constants.colors.dullYellow,
								}],
							},
						},
					);
				}

				const removedString = localise(client, 'music.options.remove.strings.removed.header', defaultLocale)();

				return void sendInteractionResponse(
					bot,
					selection.id,
					selection.token,
					{
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							embeds: [{
								title: `${constants.symbols.music.removed} ${removedString}`,
								description: localise(client, 'music.options.remove.strings.removed.body', defaultLocale)(
									{
										'title': songListing.content.title,
										'user_mention': mention(selection.user.id, MentionTypes.User),
									},
								),
								color: constants.colors.invisible,
							}],
						},
					},
				);
			},
		},
	);

	if (pages.at(0)?.length === 0) {
		return {
			embeds: [{
				description: localise(client, 'music.options.remove.strings.noListingToRemove', locale)(),
				color: constants.colors.blue,
			}],
			components: [],
		};
	}

	return {
		embeds: [{
			description: localise(client, 'music.options.remove.strings.selectSongToRemove', locale)(),
			color: constants.colors.blue,
			footer: isLast ? undefined : { text: localise(client, 'interactions.continuedOnNextPage', locale)() },
		}],
		components: [
			generateSelectMenu(data, pages, selectMenuCustomId),
			...generateButtons(buttonsCustomId, isFirst, isLast),
		],
	};
}

function generateSelectMenu(data: RemoveListingData, pages: SongListing[][], selectMenuCustomId: string): ActionRow {
	const page = pages.at(data.pageIndex)!;

	return {
		type: MessageComponentTypes.ActionRow,
		components: [{
			type: MessageComponentTypes.SelectMenu,
			customId: selectMenuCustomId,
			minValues: 1,
			maxValues: 1,
			options: page.map<SelectOption>(
				(songListing, index) => ({
					emoji: { name: listingTypeToEmoji[songListing.content.type] },
					label: trim(songListing.content.title, 100),
					value: (data.pageIndex * configuration.music.limits.songs.page + index).toString(),
				}),
			),
		}],
	};
}

export default command;
