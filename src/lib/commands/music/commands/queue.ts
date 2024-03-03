import constants from "../../../../constants/constants";
import { Client } from "../../../client";
import { PaginatedSongListingViewComponent } from "../../../components/paginated-view";
import { OptionTemplate } from "../../command";
import { show } from "../../parameters";

const command: OptionTemplate = {
	id: "queue",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackQueue,
	options: [show],
	flags: {
		isShowable: true,
	},
};

async function handleDisplayPlaybackQueue(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyVoiceState(interaction, "check");
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toCheck: client.localise("music.strings.notPlaying.description.toCheck", locale)(),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toCheck,
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

	const strings = {
		queue: client.localise("music.options.queue.strings.queue", locale)(),
	};

	// TODO(vxern): This may not display the updated listings on history change.
	const viewComponent = new PaginatedSongListingViewComponent(client, {
		interaction,
		title: `${constants.symbols.music.list} ${strings.queue}`,
		listings: queue,
	});

	const refreshViewComponent = async () => viewComponent.refresh();
	const closeViewComponent = async () => viewComponent.close();

	events.on("queueUpdate", refreshViewComponent);
	events.on("stop", closeViewComponent);

	setTimeout(() => {
		events.off("queueUpdate", refreshViewComponent);
		events.off("stop", closeViewComponent);
	}, constants.INTERACTION_TOKEN_EXPIRY);

	await viewComponent.open();
}

export default command;
