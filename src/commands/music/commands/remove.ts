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
import { chunk, createInteractionCollector, trim } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.remove),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: removeSongListing,
};

function removeSongListing(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
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
						description: localise(
							Commands.music.options.remove.strings.noListingToRemove,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const queueChunks = chunk(
		musicController.queue,
		configuration.music.maxima.songs.page,
	);

	let pageIndex = 0;
	let page: SongListing[];

	const isFirst = () => pageIndex === 0;
	const isLast = () => pageIndex === queueChunks.length - 1;

	const generateSelectMenu = (): ActionRow => {
		page = queueChunks.at(pageIndex)!;

		return {
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.SelectMenu,
				customId: selectMenuCustomId,
				minValues: 1,
				maxValues: 1,
				options: page.map<SelectOption>((
					songListing,
					index,
				) => ({
					emoji: {
						name: configuration.music.symbols[songListing.content.type]!,
					},
					label: trim(songListing.content.title, 100),
					value: (pageIndex * configuration.music.maxima.songs.page + index)
						.toString(),
				})),
			}],
		};
	};

	const generateButtons = (): MessageComponents => {
		const buttons: ButtonComponent[] = [];

		if (!isFirst()) {
			buttons.push({
				type: MessageComponentTypes.Button,
				customId: `${buttonsCustomId}|PREVIOUS`,
				style: ButtonStyles.Secondary,
				label: '«',
			});
		}

		if (!isLast()) {
			buttons.push({
				type: MessageComponentTypes.Button,
				customId: `${buttonsCustomId}|NEXT`,
				style: ButtonStyles.Secondary,
				label: '»',
			});
		}

		return buttons.length === 0 ? [] : [{
			type: MessageComponentTypes.ActionRow,
			components: <[ButtonComponent] | [
				ButtonComponent | ButtonComponent,
			]> buttons,
		}];
	};

	const generateEmbed: () => InteractionCallbackData = () => ({
		embeds: [{
			description: localise(
				Commands.music.options.remove.strings.selectSongToRemove,
				interaction.locale,
			),
			color: configuration.interactions.responses.colors.blue,
			footer: isLast() ? undefined : {
				text: localise(
					Commands.music.options.remove.strings.continuedOnTheNextPage,
					interaction.locale,
				),
			},
		}],
		components: [generateSelectMenu(), ...generateButtons()],
	});

	const buttonsCustomId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: (bot, selection) => {
			if (!selection.data) return;

			const action = selection.data.customId!.split('|')[1]!;

			switch (action) {
				case 'PREVIOUS':
					if (!isFirst()) pageIndex--;
					break;
				case 'NEXT':
					if (!isLast()) pageIndex++;
					break;
			}

			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			editOriginalInteractionResponse(bot, interaction.token, generateEmbed());
		},
	});

	const selectMenuCustomId = createInteractionCollector(
		[client, bot],
		{
			type: InteractionTypes.MessageComponent,
			userId: interaction.user.id,
			limit: 1,
			onCollect: (bot, selection) => {
				const indexString = <string | undefined> selection.data?.values?.at(
					0,
				);
				if (!indexString) return;

				const index = Number(indexString);
				if (isNaN(index)) return;

				const songListing = musicController.queue.splice(index, 1)?.at(0);
				if (!songListing) {
					return void sendInteractionResponse(
						bot,
						selection.id,
						selection.token,
						{
							type: InteractionResponseTypes.ChannelMessageWithSource,
							data: {
								embeds: [{
									description: localise(
										Commands.music.options.remove.strings.failedToRemoveSong,
										interaction.locale,
									),
									color: configuration.interactions.responses.colors.yellow,
								}],
							},
						},
					);
				}

				return void sendInteractionResponse(
					bot,
					selection.id,
					selection.token,
					{
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							embeds: [{
								title: `❌ ${
									localise(
										Commands.music.options.remove.strings.removed.header,
										defaultLanguage,
									)
								}`,
								description: localise(
									Commands.music.options.remove.strings.removed.body,
									defaultLanguage,
								)(
									songListing.content.title,
									mention(selection.user.id, MentionTypes.User),
								),
								color: configuration.interactions.responses.colors.invisible,
							}],
						},
					},
				);
			},
		},
	);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				...generateEmbed(),
			},
		},
	);
}

export default command;
