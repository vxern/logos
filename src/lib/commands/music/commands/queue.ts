import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../types";
import { Client, localise } from "../../../client";
import { parseArguments } from "../../../interactions";
import { OptionTemplate } from "../../command";
import { show } from "../../parameters";
import { displayListings } from "../module";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "queue",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackQueue,
	options: [show],
};

async function handleDisplayPlaybackQueue(
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

	const queue = musicService.queue;
	if (queue === undefined) {
		return;
	}

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		queue: localise(client, "music.options.queue.strings.queue", locale)(),
	};

	displayListings(
		[client, bot],
		interaction,
		{ title: `${constants.symbols.music.list} ${strings.queue}`, songListings: queue },
		show ?? false,
		locale,
	);
}

export default command;
