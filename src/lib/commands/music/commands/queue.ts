import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";
import { displayListings } from "../module.js";
import { OptionTemplate } from "../../command.js";
import { show } from "../../parameters.js";
import { Client, localise } from "../../../client.js";
import { parseArguments } from "../../../interactions.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";

const command: OptionTemplate = {
	name: "queue",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackQueue,
	options: [show],
};

function handleDisplayPlaybackQueue([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		queue: localise(client, "music.options.queue.strings.queue", locale)(),
	};

	return displayListings(
		[client, bot],
		interaction,
		{ title: `${constants.symbols.music.list} ${strings.queue}`, songListings: controller.listingQueue },
		show ?? false,
		locale,
	);
}

export default command;
