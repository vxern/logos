import { mention } from "../../../../formatting";
import { Client } from "../../../client";
import { PaginatedRemoveSongListingViewComponent } from "../../../components/paginated-view";
import { OptionTemplate } from "../../command";

const command: OptionTemplate = {
	id: "remove",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleRemoveSongListing,
};

async function handleRemoveSongListing(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;
	const guildLocale = interaction.guildLocale;

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

	const [events, queue] = [musicService.events, musicService.queue];
	if (events === undefined || queue === undefined) {
		return;
	}

	// TODO(vxern): This may not display the updated listings on queue change.
	const viewComponent = new PaginatedRemoveSongListingViewComponent(client, { interaction, listings: queue });

	viewComponent.onCollect(async (buttonPress) => {
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
				user_mention: mention(buttonPress.user.id, { type: "user" }),
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

	const refreshViewComponent = async () => viewComponent.refresh();
	const closeViewComponent = async () => client.deleteReply(interaction);

	events.on("queueUpdate", refreshViewComponent);
	events.on("stop", closeViewComponent);

	setTimeout(() => {
		events.off("queueUpdate", refreshViewComponent);
		events.off("stop", closeViewComponent);
	}, constants.INTERACTION_TOKEN_EXPIRY);

	await viewComponent.open();
}

export default command;
