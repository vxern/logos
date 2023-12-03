import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import defaults from "../../../../defaults";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { chunk } from "../../../utils";
import { OptionTemplate } from "../../command";
import { show } from "../../parameters";
import { displayListings } from "../module";

const command: OptionTemplate = {
	name: "queue",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	isShowable: true,
	handle: handleDisplayPlaybackQueue,
	options: [show],
};

async function handleDisplayPlaybackQueue(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
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
			title: localise(client, "music.strings.notPlaying.title", locale)(),
			description: {
				toCheck: localise(client, "music.strings.notPlaying.description.toCheck", locale)(),
			},
		};

		reply([client, bot], interaction, {
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
		queue: localise(client, "music.options.queue.strings.queue", locale)(),
	};

	const regenerate = await displayListings(
		[client, bot],
		interaction,
		{
			title: `${constants.symbols.music.list} ${strings.queue}`,
			getSongListings: () => chunk(queue, defaults.RESULTS_PER_PAGE),
		},
		show ?? false,
		{ locale },
	);

	events.on("queueUpdate", regenerate);
	events.on("stop", regenerate);

	setTimeout(() => {
		events.off("queueUpdate", regenerate);
		events.off("stop", regenerate);
	}, constants.INTERACTION_TOKEN_EXPIRY);
}

export default command;
