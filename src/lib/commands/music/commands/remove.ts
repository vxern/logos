import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention, trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, InteractionCollector } from "../../../client";
import { PageButtonMetadata, getPageButtons } from "../../../interactions";
import { MusicService } from "../../../services/music/music";
import { chunk } from "../../../utils";
import { OptionTemplate } from "../../command";
import { SongListing, listingTypeToEmoji } from "../data/types";

const command: OptionTemplate = {
	id: "remove",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleRemoveSongListing,
};

async function handleRemoveSongListing(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toManage: client.localise("music.strings.notPlaying.description.toManage", locale)(),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toManage,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	const [events, isQueueEmpty] = [musicService.events, musicService.isQueueEmpty];
	if (events === undefined || isQueueEmpty === undefined) {
		return;
	}

	if (isQueueEmpty) {
		const strings = {
			title: client.localise("music.options.remove.strings.queueEmpty.description", locale)(),
			description: client.localise("music.options.remove.strings.queueEmpty.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	const removeListingData = { pageIndex: 0 };

	const interactionResponseData = await generateEmbed(client, interaction, musicService, removeListingData, {
		locale,
		guildLocale: interaction.guildLocale,
	});
	if (interactionResponseData === undefined) {
		return;
	}

	const onQueueUpdateListener = async () => {
		const interactionResponseData = await generateEmbed(client, interaction, musicService, removeListingData, {
			locale,
			guildLocale: interaction.guildLocale,
		});
		if (interactionResponseData !== undefined) {
			client.editReply(interaction, interactionResponseData);
		}
	};

	const onStopListener = async () => client.deleteReply(interaction);

	events.on("queueUpdate", onQueueUpdateListener);
	events.on("stop", onStopListener);

	setTimeout(() => {
		events.off("queueUpdate", onQueueUpdateListener);
		events.off("stop", onStopListener);
	}, constants.INTERACTION_TOKEN_EXPIRY);

	client.reply(interaction, interactionResponseData);
}

interface RemoveListingData {
	pageIndex: number;
}

async function generateEmbed(
	client: Client,
	interaction: Logos.Interaction,
	musicService: MusicService,
	data: RemoveListingData,
	{ locale, guildLocale }: { locale: Locale; guildLocale: Locale },
): Promise<Discord.InteractionCallbackData | undefined> {
	const queue = musicService.queue;
	if (queue === undefined) {
		return undefined;
	}

	const pages = chunk(queue, defaults.RESULTS_PER_PAGE);

	const isFirst = data.pageIndex === 0;
	const isLast = data.pageIndex === pages.length - 1;

	const pageButtons = new InteractionCollector<PageButtonMetadata>(client, { only: [interaction.user.id] });
	const selectMenuSelection = new InteractionCollector(client, { only: [interaction.user.id] });

	pageButtons.onCollect(async (buttonPress) => {
		client.acknowledge(buttonPress);

		switch (buttonPress.metadata[1]) {
			case "previous": {
				if (!isFirst) {
					data.pageIndex--;
				}
				break;
			}
			case "next": {
				if (!isLast) {
					data.pageIndex++;
				}
				break;
			}
		}

		const interactionResponseData = await generateEmbed(client, interaction, musicService, data, {
			locale,
			guildLocale,
		});
		if (interactionResponseData === undefined) {
			return;
		}

		client.editReply(interaction, interactionResponseData);
	});

	selectMenuSelection.onCollect(async (buttonPress) => {
		const indexString = buttonPress.data?.values?.at(0) as string | undefined;
		if (indexString === undefined) {
			return;
		}

		const index = Number(indexString);
		if (!Number.isSafeInteger(index)) {
			return;
		}

		const songListing = musicService.remove(index);
		if (songListing === undefined) {
			const strings = {
				title: client.localise("music.options.remove.strings.failed.title", locale)(),
				description: client.localise("music.options.remove.strings.failed.description", locale)(),
			};

			client.reply(buttonPress, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		}

		const strings = {
			title: client.localise("music.options.remove.strings.removed.title", guildLocale)(),
			description: client.localise(
				"music.options.remove.strings.removed.description",
				guildLocale,
			)({
				title: songListing.content.title,
				user_mention: mention(buttonPress.user.id, MentionTypes.User),
			}),
		};

		client.reply(
			buttonPress,
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
	});

	client.registerInteractionCollector(pageButtons);
	client.registerInteractionCollector(selectMenuSelection);

	if (pages.at(0)?.length === 0) {
		const strings = {
			title: client.localise("music.options.remove.strings.queueEmpty.title", locale)(),
			description: client.localise("music.options.remove.strings.queueEmpty.description", locale)(),
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
		title: client.localise("music.options.remove.strings.selectSong.title", locale)(),
		description: client.localise("music.options.remove.strings.selectSong.description", locale)(),
		continuedOnNextPage: client.localise("interactions.continuedOnNextPage", locale)(),
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
			generateSelectMenu(data, pages, selectMenuSelection.customId),
			...getPageButtons({ pageButtons, isFirst, isLast }),
		],
	};
}

function generateSelectMenu(
	data: RemoveListingData,
	pages: SongListing[][],
	selectMenuCustomId: string,
): Discord.ActionRow {
	const page = pages.at(data.pageIndex);
	if (page === undefined) {
		return {
			type: Discord.MessageComponentTypes.ActionRow,
			components: [
				{
					type: Discord.MessageComponentTypes.SelectMenu,
					customId: selectMenuCustomId,
					minValues: 1,
					maxValues: 1,
					options: [{ label: "?", value: constants.components.none }],
				},
			],
		};
	}

	return {
		type: Discord.MessageComponentTypes.ActionRow,
		components: [
			{
				type: Discord.MessageComponentTypes.SelectMenu,
				customId: selectMenuCustomId,
				minValues: 1,
				maxValues: 1,
				options: page.map<Discord.SelectOption>((songListing, index) => ({
					emoji: { name: listingTypeToEmoji[songListing.content.type] },
					label: trim(songListing.content.title, 100),
					value: (data.pageIndex * defaults.RESULTS_PER_PAGE + index).toString(),
				})),
			},
		],
	};
}

export default command;
