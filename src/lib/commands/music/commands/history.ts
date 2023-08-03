import constants from "../../../../constants/constants";
import defaults from "../../../../defaults";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { OptionTemplate } from "../../command";
import { show } from "../../parameters";
import { displayListings } from "../module";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "history",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackHistory,
	options: [show],
};

async function handleDisplayPlaybackHistory(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyVoiceState(bot, interaction, "check");
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const strings = {
			title: localise(client, "music.strings.notPlaying.title", interaction.locale)(),
			description: {
				toCheck: localise(client, "music.strings.notPlaying.description.toCheck", interaction.locale)(),
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

	const historyReversed = musicService.history;
	if (historyReversed === undefined) {
		return;
	}

	const history = structuredClone(historyReversed).reverse();

	const locale = show ? defaults.LOCALISATION_LOCALE : interaction.locale;

	const strings = {
		title: localise(client, "music.options.history.strings.playbackHistory", locale)(),
	};

	displayListings(
		[client, bot],
		interaction,
		{ title: `${constants.symbols.music.list} ${strings.title}`, songListings: history },
		show ?? false,
		locale,
	);
}

export default command;
