import {
	ActionRow,
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	ButtonComponent,
	ButtonStyles,
	editOriginalInteractionResponse,
	Interaction,
	InteractionCallbackData,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponents,
	MessageComponentTypes,
	SelectOption,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { SongListing } from 'logos/src/commands/music/data/types.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { mention, MentionTypes, trim } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.remove),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleRemoveSongListing,
};

function handleRemoveSongListing(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.features.music.controllers.get(interaction.guildId!);
	if (musicController === undefined) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(bot, interaction);
	if (!canAct) return;

	if (musicController.queue.length === 0) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.remove.strings.noListingToRemove, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	const pages = chunk(musicController.queue, configuration.music.limits.songs.page);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				...generateEmbed([client, bot], interaction, {
					pages,
					remove: (index) => musicController.queue.splice(index, 1)?.at(0),
					pageIndex: 0,
				}, interaction.locale),
			},
		},
	);
}

interface RemoveListingData {
	readonly pages: SongListing[][];
	readonly remove: (index: number) => SongListing | undefined;
	pageIndex: number;
}

function generateEmbed(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: RemoveListingData,
	locale: string | undefined,
): InteractionCallbackData {
	const isFirst = data.pageIndex === 0;
	const isLast = data.pageIndex === data.pages.length - 1;

	const buttonsCustomId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: (bot, selection) => {
			if (selection.data === undefined) return;

			const action = selection.data.customId!.split('|')[1]!;

			switch (action) {
				case 'PREVIOUS':
					if (!isFirst) data.pageIndex--;
					break;
				case 'NEXT':
					if (!isLast) data.pageIndex++;
					break;
			}

			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			editOriginalInteractionResponse(bot, interaction.token, generateEmbed([client, bot], interaction, data, locale));
		},
	});

	const selectMenuCustomId = createInteractionCollector(
		[client, bot],
		{
			type: InteractionTypes.MessageComponent,
			userId: interaction.user.id,
			limit: 1,
			onCollect: (bot, selection) => {
				const indexString = <string | undefined> selection.data?.values?.at(0);
				if (indexString === undefined) return;

				const index = Number(indexString);
				if (isNaN(index)) return;

				const songListing = data.remove(index);
				if (songListing === undefined) {
					return void sendInteractionResponse(
						bot,
						selection.id,
						selection.token,
						{
							type: InteractionResponseTypes.ChannelMessageWithSource,
							data: {
								embeds: [{
									description: localise(Commands.music.options.remove.strings.failedToRemoveSong, interaction.locale),
									color: configuration.messages.colors.yellow,
								}],
							},
						},
					);
				}

				const removedString = localise(Commands.music.options.remove.strings.removed.header, defaultLocale);

				return void sendInteractionResponse(
					bot,
					selection.id,
					selection.token,
					{
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							embeds: [{
								title: `❌ ${removedString}`,
								description: localise(Commands.music.options.remove.strings.removed.body, defaultLocale)(
									songListing.content.title,
									mention(selection.user.id, MentionTypes.User),
								),
								color: configuration.messages.colors.invisible,
							}],
						},
					},
				);
			},
		},
	);

	return {
		embeds: [{
			description: localise(Commands.music.options.remove.strings.selectSongToRemove, locale),
			color: configuration.messages.colors.blue,
			footer: isLast ? undefined : {
				text: localise(Commands.music.options.remove.strings.continuedOnTheNextPage, locale),
			},
		}],
		components: [generateSelectMenu(data, selectMenuCustomId), ...generateButtons(buttonsCustomId, isFirst, isLast)],
	};
}

function generateSelectMenu(data: RemoveListingData, selectMenuCustomId: string): ActionRow {
	const page = data.pages.at(data.pageIndex)!;

	return {
		type: MessageComponentTypes.ActionRow,
		components: [{
			type: MessageComponentTypes.SelectMenu,
			customId: selectMenuCustomId,
			minValues: 1,
			maxValues: 1,
			options: page.map<SelectOption>(
				(songListing, index) => ({
					emoji: { name: configuration.music.symbols[songListing.content.type]! },
					label: trim(songListing.content.title, 100),
					value: (data.pageIndex * configuration.music.limits.songs.page + index).toString(),
				}),
			),
		}],
	};
}

function generateButtons(buttonsCustomId: string, isFirst: boolean, isLast: boolean): MessageComponents {
	const buttons: ButtonComponent[] = [];

	if (!isFirst) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: `${buttonsCustomId}|PREVIOUS`,
			style: ButtonStyles.Secondary,
			label: '«',
		});
	}

	if (!isLast) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: `${buttonsCustomId}|NEXT`,
			style: ButtonStyles.Secondary,
			label: '»',
		});
	}

	// @ts-ignore: It is guaranteed that there will be fewer than five buttons.
	return buttons.length === 0 ? [] : [{
		type: MessageComponentTypes.ActionRow,
		components: buttons,
	}];
}

export default command;
