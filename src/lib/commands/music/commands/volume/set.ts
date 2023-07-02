import configuration from "../../../../../configuration.js";
import constants from "../../../../../constants.js";
import { Client, localise } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import { getVoiceState, setVolume, verifyCanManagePlayback } from "../../../../services/music/music.js";
import * as Discord from "discordeno";

async function handleSetVolume([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const controller = client.features.music.controllers.get(guildId);
	if (controller === undefined) {
		return;
	}

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, guildId, interaction.user.id),
	);
	if (!isVoiceStateVerified) {
		return;
	}

	const [{ volume }] = parseArguments(interaction.data?.options, { volume: "number" });
	if (volume === undefined || isNaN(volume)) {
		return;
	}

	if (volume < 0 || volume > configuration.music.limits.volume) {
		const strings = {
			title: localise(client, "music.options.volume.options.set.strings.invalid.title", interaction.locale)(),
			description: localise(
				client,
				"music.options.volume.options.set.strings.invalid.description",
				interaction.locale,
			)({ volume: configuration.music.limits.volume }),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	setVolume(controller.player, volume);

	const strings = {
		title: localise(client, "music.options.volume.options.set.strings.set.title", interaction.locale)(),
		description: localise(
			client,
			"music.options.volume.options.set.strings.set.description",
			interaction.locale,
		)({ volume: volume }),
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
		{ visible: true },
	);
}

export { handleSetVolume };
