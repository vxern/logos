import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { RemoveSongListingView } from "logos/commands/components/paginated-views/remove-song-listing-view";

async function handleRemoveSongListing(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;
	const guildLocale = interaction.guildLocale;

	const musicService = client.getMusicService(interaction.guildId);
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

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description.toManage,
		});

		return;
	}

	const events = musicService.events;
	if (events === undefined) {
		return;
	}

	const view = new RemoveSongListingView(client, { interaction, listings: musicService.session.queue });

	view.onInteraction(async (buttonPress) => {
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

			await client.failed(buttonPress, {
				title: strings.title,
				description: strings.description,
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

		await client.success(
			buttonPress,
			{
				title: `${constants.emojis.music.removed} ${strings.title}`,
				description: strings.description,
			},
			{ visible: true },
		);
	});

	const refreshView = async () => view.refresh();
	const closeView = async () => view.close();

	events.on("queueUpdate", refreshView);
	events.on("stop", closeView);

	setTimeout(() => {
		events.off("queueUpdate", refreshView);
		events.off("stop", closeView);
	}, constants.INTERACTION_TOKEN_EXPIRY);

	await view.open();
}

export { handleRemoveSongListing };
