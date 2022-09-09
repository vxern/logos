import {
	ActionRow,
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	ButtonComponent,
	ButtonStyles,
	editInteractionResponse,
	EditWebhookMessage,
	Interaction,
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
import { chunk, createInteractionCollector, trim } from '../../../utils.ts';
import { SongListing } from '../data/song-listing.ts';

const command: OptionBuilder = {
	name: 'remove',
	nameLocalizations: {
		pl: 'usuń',
		ro: 'ștergere',
	},
	description: 'Removes a song listing from the queue.',
	descriptionLocalizations: {
		pl: 'Usuwa wpis z kolejki muzycznej.',
		ro: 'Șterge o înregistrare din coadă.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: removeSongListing,
};

function removeSongListing(
	client: Client,
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
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Nothing to remove',
						description: 'There are no songs in the queue.',
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

	const generateEmbed: () => EditWebhookMessage = () => ({
		embeds: [{
			title: 'Select a song / song collection to remove',
			description: 'Select a song or song collection from the choices below.',
			color: configuration.interactions.responses.colors.blue,
			footer: isLast() ? undefined : { text: 'Continued on the next page...' },
		}],
		components: [generateSelectMenu(), ...generateButtons()],
	});

	const buttonsCustomId = createInteractionCollector(client, {
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

			editInteractionResponse(bot, interaction.token, generateEmbed());
		},
	});

	const selectMenuCustomId = createInteractionCollector(
		client,
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
									title: 'Failed to remove song',
									description:
										`The song you attempted to remove no longer exists.

This may be due to another user removing the song, or the queue having advanced.`,
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
								title: '❌ Removed',
								description:
									`The song **${songListing.content.title}** has been removed by ${
										mention(selection.user.id, MentionTypes.User)
									}.`,
								color: configuration.interactions.responses.colors.invisible,
							}],
						},
					},
				);
			},
		},
	);

	return void sendInteractionResponse(
		client.bot,
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
