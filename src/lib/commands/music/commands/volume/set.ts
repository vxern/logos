import constants from "../../../../../constants.js";
import defaults from "../../../../../defaults.js";
import { Client, localise } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import * as Discord from "discordeno";

async function handleSetVolume([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(bot, interaction);
	if (isVoiceStateVerified === undefined || !isVoiceStateVerified) {
		return;
	}

	const [{ volume }] = parseArguments(interaction.data?.options, { volume: "number" });
	if (volume === undefined || isNaN(volume)) {
		return;
	}

	if (volume < 0 || volume > defaults.MAX_VOLUME) {
		const strings = {
			title: localise(client, "music.options.volume.options.set.strings.invalid.title", interaction.locale)(),
			description: localise(
				client,
				"music.options.volume.options.set.strings.invalid.description",
				interaction.locale,
			)({ volume: defaults.MAX_VOLUME }),
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

	musicService.setVolume(volume);

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
