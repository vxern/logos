import {
	ActionRow,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionCallbackData,
	InteractionTypes,
	MessageComponentTypes,
	SelectOption,
} from "discordeno";
import { listingTypeToEmoji, SongListing } from "../data/types.js";
import { OptionTemplate } from "../../command.js";
import {
	getVoiceState,
	isQueueEmpty,
	MusicController,
	remove,
	verifyCanManagePlayback,
} from "../../../controllers/music.js";
import { Client, localise } from "../../../client.js";
import {
	acknowledge,
	ControlButtonID,
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	generateButtons,
	reply,
} from "../../../interactions.js";
import { chunk } from "../../../utils.js";
import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { mention, MentionTypes, trim } from "../../../../formatting.js";
import { defaultLocale } from "../../../../types.js";

const command: OptionTemplate = {
	name: "remove",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleRemoveSongListing,
};

function handleRemoveSongListing([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	if (isQueueEmpty(controller.listingQueue)) {
		const strings = {
			title: localise(client, "music.options.remove.strings.queueEmpty.description", interaction.locale)(),
			description: localise(client, "music.options.remove.strings.queueEmpty.description", interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
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
		editReply(
			[client, bot],
			interaction,
			generateEmbed([client, bot], interaction, controller, removeListingData, interaction.locale),
		);

	const onStopListener = () => deleteReply([client, bot], interaction);

	controller.events.on("queueUpdate", onQueueUpdateListener);
	controller.events.on("stop", onStopListener);

	setTimeout(() => {
		controller.events.off("queueUpdate", onQueueUpdateListener);
		controller.events.off("stop", onStopListener);
	}, constants.interactionTokenExpiryInterval);

	return void reply([client, bot], interaction, interactionResponseData);
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
			acknowledge([client, bot], selection);

			if (selection.data === undefined) return;

			const [_, action] = decodeId<ControlButtonID>(selection.data.customId!);

			switch (action) {
				case "previous":
					if (!isFirst) data.pageIndex--;
					break;
				case "next":
					if (!isLast) data.pageIndex++;
					break;
			}

			editReply([client, bot], interaction, generateEmbed([client, bot], interaction, controller, data, locale));
		},
	});

	const selectMenuCustomId = createInteractionCollector([client, bot], {
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
				const strings = {
					title: localise(client, "music.options.remove.strings.failed.title", interaction.locale)(),
					description: localise(client, "music.options.remove.strings.failed.description", interaction.locale)(),
				};

				return void reply([client, bot], selection, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});
			}

			const strings = {
				title: localise(client, "music.options.remove.strings.removed.title", defaultLocale)(),
				description: localise(
					client,
					"music.options.remove.strings.removed.description",
					defaultLocale,
				)({
					title: songListing.content.title,
					user_mention: mention(selection.user.id, MentionTypes.User),
				}),
			};

			return void reply(
				[client, bot],
				selection,
				{
					embeds: [
						{
							title: `${constants.symbols.music.removed} ${strings.title}`,
							description: strings.description,
							color: constants.colors.blue,
						},
					],
				},
				{ visible: true },
			);
		},
	});

	if (pages.at(0)?.length === 0) {
		const strings = {
			title: localise(client, "music.options.remove.strings.queueEmpty.title", locale)(),
			description: localise(client, "music.options.remove.strings.queueEmpty.description", locale)(),
		};

		return {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
			components: [],
		};
	}

	const strings = {
		title: localise(client, "music.options.remove.strings.selectSong.title", locale)(),
		description: localise(client, "music.options.remove.strings.selectSong.description", locale)(),
		continuedOnNextPage: localise(client, "interactions.continuedOnNextPage", locale)(),
	};

	return {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
				footer: isLast ? undefined : { text: strings.continuedOnNextPage },
			},
		],
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
		components: [
			{
				type: MessageComponentTypes.SelectMenu,
				customId: selectMenuCustomId,
				minValues: 1,
				maxValues: 1,
				options: page.map<SelectOption>((songListing, index) => ({
					emoji: { name: listingTypeToEmoji[songListing.content.type] },
					label: trim(songListing.content.title, 100),
					value: (data.pageIndex * configuration.music.limits.songs.page + index).toString(),
				})),
			},
		],
	};
}

export default command;
