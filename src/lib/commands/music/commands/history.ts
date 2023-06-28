import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";
import { displayListings } from "../module.js";
import { OptionTemplate } from "../../command.js";
import { show } from "../../parameters.js";
import { Client, localise } from "../../../client.js";
import { parseArguments } from "../../../interactions.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";

const command: OptionTemplate = {
	name: "history",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackHistory,
	options: [show],
};

function handleDisplayPlaybackHistory([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const listingHistory = structuredClone(controller.listingHistory).reverse();

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		title: localise(client, "music.options.history.strings.playbackHistory", locale)(),
	};

	return displayListings(
		[client, bot],
		interaction,
		{ title: `${constants.symbols.music.list} ${strings.title}`, songListings: listingHistory },
		show ?? false,
		locale,
	);
}

export default command;
