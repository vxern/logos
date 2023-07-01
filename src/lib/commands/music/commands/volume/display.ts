import constants from "../../../../../constants.js";
import { defaultLocale } from "../../../../../types.js";
import { Client, localise } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import { getVoiceState, verifyVoiceState } from "../../../../services/music/music.js";
import { Bot, Interaction } from "discordeno";

async function handleDisplayVolume([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const controller = client.features.music.controllers.get(guildId);
	if (controller === undefined) {
		return;
	}

	const isVoiceStateVerified = verifyVoiceState(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, guildId, interaction.user.id),
		"check",
	);
	if (!isVoiceStateVerified) {
		return;
	}

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		title: localise(client, "music.options.volume.options.display.strings.volume.title", locale)(),
		description: localise(
			client,
			"music.options.volume.options.display.strings.volume.description",
			locale,
		)({ volume: controller.player.volume }),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.volume} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: show },
	);
}

export { handleDisplayVolume };
