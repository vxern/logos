import { Commands } from '../../../../assets/localisations/commands.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
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
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { mention, MentionTypes } from '../../../formatting.ts';
import { defaultLanguage } from '../../../types.ts';
import { chunk, createInteractionCollector, trim } from '../../../utils.ts';
import { SongListing } from '../data/song-listing.ts';

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
							Commands.music.strings.nothingToRemove,
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
				Commands.music.strings.selectSongToRemove,
				interaction.locale,
			),
			color: configuration.interactions.responses.colors.blue,
			footer: isLast() ? undefined : {
				text: localise(
					Commands.music.strings.continuedOnTheNextPage,
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
										Commands.music.strings.failedToRemoveSong,
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
									Commands.music.strings.removed.header[defaultLanguage]
								}`,
								description: Commands.music.strings.removed.body
									[defaultLanguage](
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
